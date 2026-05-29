"use client";
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";

export function ImportDropZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => /\.(pdf|jpe?g|png)$/i.test(f.name));
    setFiles((prev) => [...prev, ...arr]);
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      if (res.redirected) {
        window.location.href = res.url;
      } else if (res.ok) {
        window.location.reload();
      } else {
        alert(`Ошибка загрузки: ${res.status}`);
        setUploading(false);
      }
    } catch (err) {
      alert(`Сетевая ошибка: ${(err as Error).message}`);
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="file"
        name="files"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={[
          "bg-bg-surface border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-flag-low bg-bg-elevated"
            : "border-border-card hover:border-border-active",
        ].join(" ")}
      >
        <Upload size={32} className={dragOver ? "mx-auto text-flag-low mb-3" : "mx-auto text-text-faint mb-3"} />
        <div className="text-text-strong text-sm font-medium">
          {dragOver ? "Отпусти чтобы добавить" : "Перетащи PDF / фото или клик чтобы выбрать"}
        </div>
        <div className="text-text-faint text-xs mt-1">Поддерживаются PDF, JPG, PNG.</div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 bg-bg-surface border border-border-soft rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-text-faint mb-2">
            Готово к загрузке ({files.length})
          </div>
          <ul className="space-y-1">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between text-sm text-text-strong gap-2">
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-text-faint hover:text-flag-critical shrink-0"
                  aria-label="Убрать"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={files.length === 0 || uploading}
        className="mt-4 bg-flag-low text-bg-page rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {uploading ? "Загружаю..." : `Загрузить ${files.length || ""} в inbox`}
      </button>
    </form>
  );
}
