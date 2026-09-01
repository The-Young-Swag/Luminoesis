type ImagePreviewProps = {
    fileUrl: string
    fileName: string
  }
  
  export function ImagePreview({ fileUrl, fileName }: ImagePreviewProps) {
    return (
      <img
        src={fileUrl}
        alt={fileName}
        className="mx-auto max-w-full rounded-2xl border border-(--line) shadow-sm"
      />
    )
  }