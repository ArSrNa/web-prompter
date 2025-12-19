export interface PrompterContent {
  id: string;
  text: string;
  timestamp: number;
}

export interface ScrollControl {
  action: 'scroll' | 'position';
  value: number;
  timestamp: number;
}

export interface PrompterState {
  content: PrompterContent[];
  currentPosition: number;
  isEditing: boolean;
}