/**
 * @typedef {Object} WorkLog
 * @property {string} name      - 員工真名（已正規化）
 * @property {string} dept      - 部門名稱
 * @property {string} task      - 工作項目名稱
 * @property {string} ipProject - 授權IP專案名（或 '非授權IP'）
 * @property {number} hours     - 工時（小時）
 * @property {string} date      - 日期 YYYY-MM-DD
 * @property {string} month     - 月份 YYYY-MM
 * @property {string} note      - 備註
 */

/**
 * @typedef {Object} SalaryRecord
 * @property {string} 月份     - YYYY-MM
 * @property {number} 月薪     - 該月總成本（人事費+房租+硬體+雜費）
 * @property {number} 人事費
 * @property {number} 房租場租
 * @property {number} 硬體系統費用
 * @property {number} 雜費
 */

/**
 * @typedef {Object} AuthUser
 * @property {string} name
 * @property {string} email
 * @property {string} picture
 * @property {number} exp       - JWT 過期時間戳
 */

/**
 * @typedef {'admin'|'member'} UserRole
 */

/**
 * @typedef {Object} ProjectCost
 * @property {string} name   - 專案名稱
 * @property {number} cost   - 分攤費用
 * @property {number} hours  - 總工時
 */

/**
 * @typedef {Object} DeptCost
 * @property {string} name        - 部門名稱
 * @property {number} cost        - 分攤費用
 * @property {number} hours       - 總工時
 * @property {number} memberCount - 成員數
 */

export {};
