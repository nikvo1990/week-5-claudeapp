export type Step = {
  label: string
  status: 'pending' | 'running' | 'completed' | 'error'
}

export type DocumentPreview = {
  url: string
  type: 'pdf' | 'docx'
  filename: string
  text?: string
}
