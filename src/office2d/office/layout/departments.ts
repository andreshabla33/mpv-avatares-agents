import type { Department, DepartmentId } from '../types';
import { DepartmentId as DeptId } from '../types';

/**
 * Department configuration for the 2D office.
 * Each department represents a functional zone where agents move based on their current status.
 */

/** Color schemes for each department */
export const DEPARTMENT_COLORS: Record<DepartmentId, { primary: string; light: string; text: string }> = {
  [DeptId.RESPONDING]: {
    primary: '#3B82F6',    // Blue - Active communication
    light: '#93C5FD',      // Light blue for floor
    text: '#FFFFFF',       // White text
  },
  [DeptId.QUALIFYING]: {
    primary: '#F59E0B',    // Orange/Yellow - Lead qualification
    light: '#FCD34D',      // Light yellow for floor
    text: '#1F2937',       // Dark text for contrast
  },
  [DeptId.SCHEDULING]: {
    primary: '#10B981',    // Green - Scheduling/Calendar
    light: '#6EE7B7',      // Light green for floor
    text: '#FFFFFF',       // White text
  },
  [DeptId.REST]: {
    primary: '#6B7280',    // Gray/Purple - Rest/Waiting
    light: '#9CA3AF',      // Light gray for floor
    text: '#FFFFFF',       // White text
  },
};

/** Human-readable names for departments - shorter for display */
export const DEPARTMENT_NAMES: Record<DepartmentId, string> = {
  [DeptId.RESPONDING]: 'MENSAJES',
  [DeptId.QUALIFYING]: 'LEADS',
  [DeptId.SCHEDULING]: 'CITAS',
  [DeptId.REST]: 'DESCANSO',
};

/**
 * Get department configuration with zones for a given office layout size.
 * Zones are defined as tile coordinates where agents can walk and work.
 */
export function getDepartments(cols: number, rows: number): Department[] {
  // Create clean, regular department zones that avoid furniture areas
  // Using fixed margins for consistency across different screen sizes
  const marginLeft = 2;
  const marginRight = 2;
  const marginTop = 5;  // Start below furniture
  const marginBottom = 3;
  
  // Calculate center point
  const midCol = Math.floor(cols / 2);
  const midRow = Math.floor(rows / 2);
  
  // Zone dimensions - clean rectangular areas
  const zoneWidth = midCol - marginLeft - 2;
  const zoneHeight = midRow - marginTop - 2;

  return [
    {
      id: DeptId.RESPONDING,
      name: 'MENSAJES',
      color: DEPARTMENT_COLORS[DeptId.RESPONDING].primary,
      colorLight: DEPARTMENT_COLORS[DeptId.RESPONDING].light,
      textColor: DEPARTMENT_COLORS[DeptId.RESPONDING].text,
      // Top-left: Clean rectangular zone
      zoneTiles: generateZoneTiles(marginLeft, marginTop, midCol - 2, midRow - 1),
      labelPosition: { col: Math.floor((marginLeft + midCol - 2) / 2), row: marginTop - 1 },
    },
    {
      id: DeptId.QUALIFYING,
      name: 'LEADS',
      color: DEPARTMENT_COLORS[DeptId.QUALIFYING].primary,
      colorLight: DEPARTMENT_COLORS[DeptId.QUALIFYING].light,
      textColor: DEPARTMENT_COLORS[DeptId.QUALIFYING].text,
      // Top-right: Clean rectangular zone
      zoneTiles: generateZoneTiles(midCol + 2, marginTop, cols - marginRight, midRow - 1),
      labelPosition: { col: Math.floor((midCol + 2 + cols - marginRight) / 2), row: marginTop - 1 },
    },
    {
      id: DeptId.SCHEDULING,
      name: 'CITAS',
      color: DEPARTMENT_COLORS[DeptId.SCHEDULING].primary,
      colorLight: DEPARTMENT_COLORS[DeptId.SCHEDULING].light,
      textColor: DEPARTMENT_COLORS[DeptId.SCHEDULING].text,
      // Bottom-left: Clean rectangular zone
      zoneTiles: generateZoneTiles(marginLeft, midRow + 1, midCol - 2, rows - marginBottom),
      labelPosition: { col: Math.floor((marginLeft + midCol - 2) / 2), row: rows - marginBottom + 1 },
    },
    {
      id: DeptId.REST,
      name: 'DESCANSO',
      color: DEPARTMENT_COLORS[DeptId.REST].primary,
      colorLight: DEPARTMENT_COLORS[DeptId.REST].light,
      textColor: DEPARTMENT_COLORS[DeptId.REST].text,
      // Bottom-right: Clean rectangular zone
      zoneTiles: generateZoneTiles(midCol + 2, midRow + 1, cols - marginRight, rows - marginBottom),
      labelPosition: { col: Math.floor((midCol + 2 + cols - marginRight) / 2), row: rows - marginBottom + 1 },
    },
  ];
}

/**
 * Generate walkable tiles for a rectangular zone.
 * Returns array of tile coordinates within the bounds.
 */
function generateZoneTiles(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
): Array<{ col: number; row: number }> {
  const tiles: Array<{ col: number; row: number }> = [];
  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      tiles.push({ col: c, row: r });
    }
  }
  return tiles;
}

/**
 * Map agent status from the Edge Function to a department.
 * This determines which zone the agent should move to.
 */
export function getDepartmentForStatus(status: string): DepartmentId {
  switch (status) {
    case 'responding':
    case 'thinking':
    case 'sending':
      return DeptId.RESPONDING;

    case 'qualifying':
      return DeptId.QUALIFYING;

    case 'scheduling':
      return DeptId.SCHEDULING;

    case 'idle':
    case 'paused':
    case 'waiting':
    default:
      return DeptId.REST;
  }
}

/**
 * Get a random tile within a department zone.
 * Used for placing agents in their assigned department.
 */
export function getRandomTileInDepartment(
  department: Department,
): { col: number; row: number } | null {
  if (department.zoneTiles.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * department.zoneTiles.length);
  return department.zoneTiles[randomIndex];
}

/**
 * Check if a tile is within a department's zone.
 */
export function isTileInDepartment(
  col: number,
  row: number,
  department: Department,
): boolean {
  return department.zoneTiles.some((tile) => tile.col === col && tile.row === row);
}

/**
 * Get the department that contains a specific tile.
 */
export function getDepartmentForTile(
  col: number,
  row: number,
  departments: Department[],
): Department | null {
  for (const dept of departments) {
    if (isTileInDepartment(col, row, dept)) {
      return dept;
    }
  }
  return null;
}
