import React from 'react';
import EntityDrillDetail from './EntityDrillDetail';

export default function ProjectDetail({ project, onClose }) {
  return <EntityDrillDetail rootKind="project" rootValue={project} onClose={onClose} />;
}
