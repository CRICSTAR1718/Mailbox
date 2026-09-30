import { File, FileText, Image } from 'lucide-react';

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const PDF = 'bg-[#fce8e6] text-[#d93025] dark:bg-[#4a2321] dark:text-[#f28b82]';
const BLUE = 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#1f3a5f] dark:text-[#8ab4f8]';

function kindOf(mime) {
  if (mime === 'application/pdf') return { Icon: FileText, tone: PDF };
  if (mime.startsWith('image/')) return { Icon: Image, tone: BLUE };
  if (mime.includes('wordprocessingml') || mime === 'application/msword') return { Icon: FileText, tone: BLUE };
  return { Icon: File, tone: 'bg-tint text-muted' };
}

export default function AttachmentCard({ attachment }) {
  const { Icon, tone } = kindOf(attachment.mime_type);
  return (
    <div
      title={attachment.filename}
      className="flex h-14 w-[240px] items-center gap-3 rounded-lg border border-edge bg-panel pr-3 pl-2"
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded ${tone}`}>
        <Icon size={22} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-ink">{attachment.filename}</span>
        <span className="block text-xs text-muted">{formatSize(attachment.size_bytes)}</span>
      </span>
    </div>
  );
}
