import { useCallback } from 'react';
import { useData } from './DataContext';
import { useAuth } from '../auth/AuthContext';
import {
  listAllSpreadsheets,
  exportSheetAsXlsx,
  getFolderId,
  findCacheFile,
  readCacheFile,
  writeCacheFile,
} from '../api/gdrive';
import { parseWorkbook } from '../utils/excelParser';
import { parseSalarySheet } from '../utils/salaryParser';
import { classifyFileType } from '../utils/names';
import {
  LS_ACCESS_TOKEN,
  LS_COST_SHEET_ID,
  DEFAULT_COST_SHEET_ID,
  CACHE_TTL_MINUTES,
} from '../config/constants';

const getCostSheetId = () =>
  DEFAULT_COST_SHEET_ID || localStorage.getItem(LS_COST_SHEET_ID) || '';

const isAuthError = (err) =>
  /401|invalid[_ ]?token|invalid authentication|UNAUTHENTICATED/i.test(
    String(err?.message || err)
  );

// 平行化 export 同時跑的數量上限（Drive API 寬鬆但避免 burst）
const EXPORT_CONCURRENCY = 6;

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        results[i] = await worker(items[i], i);
      }
    })
  );
  return results;
}

export function useDataLoader() {
  const { setWorkLogs, appendWorkLogs, setSalaryData, setLoading } = useData();
  const { accessToken, refreshToken, authUser } = useAuth();

  /**
   * 從 Google Drive 載入所有工時資料
   * 流程：
   *   1. 嘗試讀 Drive 上的共享 cache file（fandora-dashboard-cache.json）
   *      → 60 分鐘內的 cache 直接用，跨設備 / 跨同事都受惠
   *   2. cache 過期或不存在 → 完整重抓 + 平行解析 → 寫回 cache file
   *
   * @param {object} opts
   * @param {boolean} opts.silent     - 不彈 loading overlay（背景同步用）
   * @param {boolean} opts.forceFresh - 強制略過 cache，重抓 + 重寫
   */
  const loadFromDrive = useCallback(
    async (opts = {}) => {
      const { silent = false, forceFresh = false } = opts;
      const _setLoading = silent ? () => {} : setLoading;

      const folderId = getFolderId();
      if (!folderId) {
        return {
          ok: false, total: 0, individual: 0, skipped: 0, parsedFiles: 0,
          parseErrors: 0, logs: 0, salaryCount: 0, error: '缺少 Folder ID',
        };
      }

      // ===== 嘗試從 Drive cache 載入（跨設備共享）=====
      const tryCloudCache = async (token) => {
        try {
          const cacheFile = await findCacheFile(folderId, token);
          if (!cacheFile) return null;
          const ageMin =
            (Date.now() - new Date(cacheFile.modifiedTime).getTime()) / 60000;
          if (ageMin > CACHE_TTL_MINUTES) {
            console.info(`[loadFromDrive] cloud cache 太舊 (${ageMin.toFixed(1)} 分鐘前)，重抓`);
            return null;
          }
          _setLoading(true, '從雲端 cache 還原資料...');
          const cache = await readCacheFile(cacheFile.id, token);
          if (
            !cache ||
            !Array.isArray(cache.workLogs) ||
            !Number.isFinite(cache.syncedAt)
          ) {
            console.warn('[loadFromDrive] cloud cache 格式異常，忽略');
            return null;
          }
          return cache;
        } catch (err) {
          if (isAuthError(err)) throw err;
          console.warn('[loadFromDrive] cloud cache 讀取失敗:', err.message);
          return null;
        }
      };

      // ===== 完整重抓 + 寫回 cache =====
      const runFreshFetch = async (token) => {
        _setLoading(true, '正在掃描 Google Drive...');
        const allFiles = await listAllSpreadsheets(folderId, token);
        const individualFiles = allFiles.filter(
          (f) => classifyFileType(f.name) === 'individual'
        );
        const skipped = allFiles.length - individualFiles.length;
        console.info(
          `[loadFromDrive] 共找到 ${allFiles.length} 個 sheet，個人版 ${individualFiles.length} 個（跳過 ${skipped}）`
        );

        let completed = 0;
        let parseErrors = 0;
        const allLogsArrays = await runWithConcurrency(
          individualFiles,
          EXPORT_CONCURRENCY,
          async (file) => {
            try {
              const buffer = await exportSheetAsXlsx(file.id, token);
              const logs = parseWorkbook(buffer, file.name);
              completed += 1;
              _setLoading(
                true,
                `已解析 ${completed}/${individualFiles.length}（${file.name}）`
              );
              return logs;
            } catch (err) {
              if (isAuthError(err)) throw err;
              parseErrors += 1;
              console.warn(`[loadFromDrive] 解析失敗: ${file.name}`, err);
              return [];
            }
          }
        );
        const allLogs = allLogsArrays.flat();

        // 載入薪資表
        let salaryRecords = [];
        const costSheetId = getCostSheetId();
        if (costSheetId) {
          try {
            _setLoading(true, '正在載入薪資表...');
            const buffer = await exportSheetAsXlsx(costSheetId, token);
            salaryRecords = parseSalarySheet(buffer);
          } catch (err) {
            console.warn('[loadFromDrive] cost sheet 載入失敗:', err.message);
          }
        }

        return {
          allLogs,
          salaryRecords,
          stats: {
            ok: true,
            total: allFiles.length,
            individual: individualFiles.length,
            skipped,
            parsedFiles: individualFiles.length - parseErrors,
            parseErrors,
            logs: allLogs.length,
          },
        };
      };

      // ===== Token 取得 / 刷新 =====
      let token = accessToken || localStorage.getItem(LS_ACCESS_TOKEN) || '';
      const tryRefresh = async (force) => {
        console.info(`[loadFromDrive] refreshing token (force=${force})...`);
        return await refreshToken({ force });
      };

      try {
        if (!token) {
          try {
            token = await tryRefresh(false);
          } catch {
            if (silent) {
              return {
                ok: false, total: 0, individual: 0, skipped: 0, parsedFiles: 0,
                parseErrors: 0, logs: 0, salaryCount: 0, error: 'silent: no token',
              };
            }
            token = await tryRefresh(true);
          }
        }

        // ===== 一個 token recovery wrapper =====
        const withTokenRetry = async (fn) => {
          try {
            return await fn(token);
          } catch (err) {
            if (!isAuthError(err)) throw err;
            try {
              token = await tryRefresh(false);
              return await fn(token);
            } catch (silentErr) {
              if (silent) {
                throw new Error('silent: refresh failed');
              }
              token = await tryRefresh(true);
              return await fn(token);
            }
          }
        };

        // ===== 1. 試讀 cloud cache（除非 forceFresh）=====
        if (!forceFresh) {
          const cache = await withTokenRetry(tryCloudCache);
          if (cache) {
            setWorkLogs(cache.workLogs);
            if (Array.isArray(cache.salaryData)) setSalaryData(cache.salaryData);
            console.info(
              `[loadFromDrive] cloud cache hit — ${cache.workLogs.length} 筆工時 (by ${cache.syncedBy}, ${Math.round((Date.now() - cache.syncedAt) / 60000)} 分鐘前)`
            );
            return {
              ok: true,
              cached: true,
              fromCloudCache: true,
              syncedBy: cache.syncedBy || null,
              syncedAt: cache.syncedAt,
              total: cache.stats?.total ?? 0,
              individual: cache.stats?.individual ?? 0,
              skipped: cache.stats?.skipped ?? 0,
              parsedFiles: cache.stats?.parsedFiles ?? 0,
              parseErrors: cache.stats?.parseErrors ?? 0,
              logs: cache.workLogs.length,
              salaryCount: Array.isArray(cache.salaryData) ? cache.salaryData.length : 0,
            };
          }
        }

        // ===== 2. 完整重抓 =====
        const result = await withTokenRetry(runFreshFetch);
        setWorkLogs(result.allLogs);
        if (result.salaryRecords.length > 0) setSalaryData(result.salaryRecords);

        // ===== 3. 寫回 cloud cache（失敗不阻斷主流程）=====
        try {
          _setLoading(true, '正在寫回雲端 cache...');
          await writeCacheFile(
            folderId,
            {
              version: 1,
              syncedAt: Date.now(),
              syncedBy: authUser?.email || null,
              stats: result.stats,
              workLogs: result.allLogs,
              salaryData: result.salaryRecords,
            },
            token
          );
          console.info('[loadFromDrive] cloud cache 已更新，下個同事 / 設備直接讀');
        } catch (err) {
          console.warn('[loadFromDrive] 寫雲端 cache 失敗（可能 OAuth scope 不足，請按「強制重新授權」）:', err.message);
        }

        return { ...result.stats, salaryCount: result.salaryRecords.length };
      } catch (err) {
        console.error('Drive 載入失敗:', err);
        return {
          ok: false, total: 0, individual: 0, skipped: 0, parsedFiles: 0,
          parseErrors: 0, logs: 0, salaryCount: 0,
          error: err?.message || String(err),
        };
      } finally {
        _setLoading(false);
      }
    },
    [accessToken, refreshToken, authUser, setWorkLogs, setSalaryData, setLoading]
  );

  /** 手動上傳工時 Excel（同樣只接受個人版） */
  const handleWorkLogUpload = useCallback(
    async (fileList) => {
      setLoading(true, '正在解析上傳的檔案...');
      try {
        let allLogs = [];
        let skipped = 0;
        for (const file of fileList) {
          if (classifyFileType(file.name) !== 'individual') {
            console.info(`[upload] 跳過非個人版檔案: ${file.name}`);
            skipped += 1;
            continue;
          }
          const buffer = await file.arrayBuffer();
          const logs = parseWorkbook(buffer, file.name);
          allLogs = allLogs.concat(logs);
        }
        if (skipped > 0) {
          console.warn(`[upload] 共跳過 ${skipped} 個非個人版檔案`);
        }
        appendWorkLogs(allLogs);
      } catch (err) {
        console.error('上傳解析失敗:', err);
      } finally {
        setLoading(false);
      }
    },
    [appendWorkLogs, setLoading]
  );

  /** 手動上傳薪資表 */
  const handleSalaryUpload = useCallback(
    async (fileList) => {
      setLoading(true, '正在解析薪資表...');
      try {
        for (const file of fileList) {
          const buffer = await file.arrayBuffer();
          const records = parseSalarySheet(buffer);
          setSalaryData(records);
        }
      } catch (err) {
        console.error('薪資表解析失敗:', err);
      } finally {
        setLoading(false);
      }
    },
    [setSalaryData, setLoading]
  );

  return { loadFromDrive, handleWorkLogUpload, handleSalaryUpload };
}
