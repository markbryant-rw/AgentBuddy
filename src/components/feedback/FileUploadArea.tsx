import { useState } from 'react';
import { X, Upload, Image, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FileUploadAreaProps {
  files: File[];
  setFiles: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
  maxSize?: number; // in bytes
  label?: string;
  description?: string;
  screenshotMode?: boolean;
  pasteOnlyMode?: boolean;
}

export const FileUploadArea = ({ 
  files, 
  setFiles, 
  maxFiles = 3,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB default
  label = 'Drop images here or click to upload',
  description = 'PNG, JPG up to 5MB each',
  screenshotMode = false,
  pasteOnlyMode = false
}: FileUploadAreaProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const isValidFileType = (file: File): boolean => {
    if (!accept) return true;
    
    const acceptedTypes = accept.split(',').map(t => t.trim());
    
    return acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return file.type === type || file.name.toLowerCase().endsWith(type.toLowerCase());
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file => 
      isValidFileType(file) && file.size <= maxSize
    );
    
    const newFiles = [...files, ...validFiles].slice(0, maxFiles);
    setFiles(newFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => 
      isValidFileType(file) && file.size <= maxSize
    );
    
    const newFiles = [...files, ...validFiles].slice(0, maxFiles);
    setFiles(newFiles);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {pasteOnlyMode ? (
        // Paste-only mode: ONLY show the paste zone
        <div className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center",
          "bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 dark:border-blue-700",
          "transition-all duration-200"
        )}>
          <Clipboard className="mx-auto h-8 w-8 text-blue-600 dark:text-blue-400 mb-3" />
          <p className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-1">
            Press Ctrl+V to Paste Screenshot
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            (Recommended method)
          </p>
        </div>
      ) : screenshotMode ? (
        // Screenshot mode: Paste-first layout
        <div className="space-y-3">
          {/* Primary: Paste Zone */}
          <div className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center",
            "bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 dark:border-blue-700",
            "transition-all duration-200"
          )}>
            <Clipboard className="mx-auto h-8 w-8 text-blue-600 dark:text-blue-400 mb-3" />
            <p className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Press Ctrl+V to Paste Screenshot
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              (Recommended method)
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Secondary: Drag & Drop / Browse */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer",
              "transition-colors duration-200",
              isDragging ? "border-primary bg-primary/5" : "border-muted"
            )}
          >
            <input
              type="file"
              multiple
              accept={accept}
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={files.length >= maxFiles}
            />
            <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag & drop or browse files
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Browse Files
            </Button>
          </div>
        </div>
      ) : (
        // Normal mode: Drag-and-drop first
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          <input
            type="file"
            multiple
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={files.length >= maxFiles}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              {label}
            </p>
            <p className="text-xs text-muted-foreground">
              {description} ({files.length}/{maxFiles} files)
            </p>
          </label>
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${file.size}`}
              className="relative group border rounded-lg p-2 bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs truncate flex-1">
                  {file.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
