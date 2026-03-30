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

/** Human-readable names for departments */
export const DEPARTMENT_NAMES: Record<DepartmentId, string> = {
  [DeptId.RESPONDING]: 'Respondiendo mensajes',
  [DeptId.QUALIFYING]: 'Calificando lead',
  [DeptId.SCHEDULING]: 'Agendando cita',
  [DeptId.REST]: 'Descanso',
};

/**
 * Get department configuration with zones for a given office layout size.
 * Zones are defined as tile coordinates where agents can walk and work.
 */
export function getDepartments(cols: number, rows: number): Department[] {
  // Divide the office into 4 quadrants for the 4 departments
  const midCol = Math.floor(cols / 2);
  const midRow = Math.floor(rows / 2);
  const labelRow = 2; // Row for department labels

  return [
    {
      id: DeptId.RESPONDING,
      name: DEPARTMENT_NAMES[DeptId.RESPONDING],
      color: DEPARTMENT_COLORS[DeptId.RESPONDING].primary,
      colorLight: DEPARTMENT_COLORS[DeptId.RESPONDING].light,
      textColor: DEPARTMENT_COLORS[DeptId.RESPONDING].text,
      // Top-left quadrant - Responding (Blue)
      zoneTiles: generateZoneTiles(2, 4, midCol - 2, midRow - 2),
      labelPosition: { col: Math.floor(midCol / 2), row: labelRow },
    },
    {
      id: DeptId.QUALIFYING,
      name: DEPARTMENT_NAMES[DeptId.QUALIFYING],
      color: DEPARTMENT_COLORS[DeptId.QUALIFYING].primary,
      colorLight: DEPARTMENT_COLORS[DeptId.QUALIFYING].light,
      textColor: DEPARTMENT_COLORS[DeptId.QUALIFYING].text,
      // Top-right quadrant - Qualifying (Orange)
      zoneTiles: generateZoneTiles(midCol + 2, 4, cols - 4, midRow - 2),
      labelPosition: { col: Math.floor((midCol + cols) / 2), row: labelRow },
    },
    {
      id: DeptId.SCHEDULING,
      name: DEPARTMENT_NAMES[DeptId.SCHEDULING],
      color: DEPARTMENT_COLORS[DeptId.SCHEDULING].primary,
      colorLight: DEPARTMENT_COLORS[DeptId.SCHEDULING].light,
      textColor: DEPARTMENT_COLORS[DeptId.SCHEDULING].text,
      // Bottom-left quadrant - Scheduling (Green)
      zoneTiles: generateZoneTiles(2, midRow + 2, midCol - 2, rows - 4),
      labelPosition: { col: Math.floor(midCol / 2), row: rows - 3 },
    },
    {
      id: DeptId.REST,
      name: DEPARTMENT_NAMES[DeptId.REST],
      color: DEPARTMENT_COLORS[DeptId.REST].primary,
      colorLight: DEPARTMENT_COLORS[DeptId.REST].light,
      textColor: DEPARTMENT_COLORS[DeptId.REST].text,
      // Bottom-right quadrant - Rest (Gray)
      zoneTiles: generateZoneTiles(midCol + 2, midRow + 2, cols - 4, rows - 4),
      labelPosition: { col: Math.floor((midCol + cols) / 2), row: rows - 3 },
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
