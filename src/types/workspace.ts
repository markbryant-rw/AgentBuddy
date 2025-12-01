export interface WorkspaceStatus {
  status: string;
  hasAlert: boolean;
  count?: number;
  overdueCount?: number;
}

export interface WorkspaceStatuses {
  plan: WorkspaceStatus;
  prospect: WorkspaceStatus;
  transact: WorkspaceStatus;
  operate: WorkspaceStatus;
  grow: WorkspaceStatus;
}
