export async function parseFile(file: File): Promise<string> {
  const isPdf = file.type === 'application/pdf'
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx')

  if (isPdf) return parsePDF(file)
  if (isDocx) return parseDOCX(file)

  throw new Error('Unsupported file type. Please upload a PDF or DOCX file.')
}

async function parsePDF(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc =
    'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(text)
  }

  const fullText = pages.join('\n\n').trim()
  if (!fullText) {
    throw new Error(
      'This PDF appears to be scanned. Please upload a text-based PDF.'
    )
  }

  return fullText
}

async function parseDOCX(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
