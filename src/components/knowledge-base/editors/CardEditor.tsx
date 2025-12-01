import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Iframe } from '@/lib/tiptap-iframe-extension';
import { extractEmbedUrl } from '@/lib/videoUtils';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bold, Italic, Heading, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKBImageUpload } from '@/hooks/useKBImageUpload';
import { resizeImage, RESIZE_PRESETS } from '@/lib/imageResize';
import { toast } from 'sonner';

interface CardEditorProps {
  content: any;
  onChange: (content: any) => void;
}

export function CardEditor({ content, onChange }: CardEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const { uploadImage, uploading } = useKBImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePastedImage = async (file: File) => {
    if (!editor) return;
    
    try {
      toast.info('Uploading image...');
      
      // Resize the image before upload
      const resizedBlob = await resizeImage(file, RESIZE_PRESETS.message);
      const resizedFile = new File([resizedBlob], file.name, { type: resizedBlob.type });
      
      // Upload using the KB image upload hook
      const url = await uploadImage(resizedFile, 'card');
      
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
        toast.success('Image added successfully');
      }
    } catch (error) {
      console.error('Failed to upload pasted image:', error);
      toast.error('Failed to upload image');
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4',
        },
      }),
      Iframe,
    ],
    content: content || { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[600px] p-6 border rounded-md text-base leading-relaxed',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        // Check for image files in clipboard
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              event.preventDefault();
              handlePastedImage(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!event.dataTransfer?.files?.length) return false;

        // Check for image files in drop
        const files = Array.from(event.dataTransfer.files);
        const imageFile = files.find(file => file.type.startsWith('image/'));
        
        if (imageFile) {
          event.preventDefault();
          handlePastedImage(imageFile);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor && content) {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  // Auto-focus editor when it loads
  useEffect(() => {
    if (editor) {
      setTimeout(() => editor.commands.focus(), 100);
    }
  }, [editor]);

  const addLink = () => {
    if (linkUrl && editor) {
      // Check if it's a video/embed URL
      const embedUrl = extractEmbedUrl(linkUrl);
      
      if (embedUrl) {
        // It's a video - insert as iframe
        editor.chain().focus().setIframe({ 
          src: embedUrl,
          width: '100%',
          height: '640',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          style: 'border: 0; min-height: 640px;'
        }).run();
        toast.success('Video embedded successfully');
      } else {
        // Regular link
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
      
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const addImage = () => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageInput(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const url = await uploadImage(file, 'card');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar - Sticky at top for easy access */}
      <div className="sticky top-0 z-10 flex flex-wrap gap-1 p-3 border rounded-md bg-background/95 backdrop-blur shadow-sm">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(editor.isActive('bold') && 'bg-accent')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(editor.isActive('italic') && 'bg-accent')}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(editor.isActive('heading', { level: 2 }) && 'bg-accent')}
        >
          <Heading className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(editor.isActive('bulletList') && 'bg-accent')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(editor.isActive('orderedList') && 'bg-accent')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn(editor.isActive('codeBlock') && 'bg-accent')}
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setShowLinkInput(!showLinkInput)}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setShowImageInput(!showImageInput)}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          id="card-image-upload"
          disabled={uploading}
        />
        <label htmlFor="card-image-upload">
          <Button type="button" size="sm" variant="ghost" asChild disabled={uploading}>
            <span className="cursor-pointer">
              {uploading ? 'Uploading...' : 'Upload Image'}
            </span>
          </Button>
        </label>
      </div>

      {/* Link Input */}
      {showLinkInput && (
        <div className="flex gap-2">
          <Input
            placeholder="Paste URL or video link (Loom, YouTube, Scribe)..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addLink()}
          />
          <Button type="button" onClick={addLink}>Add</Button>
          <Button type="button" variant="ghost" onClick={() => setShowLinkInput(false)}>Cancel</Button>
        </div>
      )}

      {/* Image URL Input */}
      {showImageInput && (
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addImage()}
          />
          <Button type="button" onClick={addImage}>Add</Button>
          <Button type="button" variant="ghost" onClick={() => setShowImageInput(false)}>Cancel</Button>
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />
      
      <p className="text-sm text-muted-foreground">
        💡 Tip: Paste images with <kbd className="px-1.5 py-0.5 text-xs font-semibold border rounded">Ctrl+V</kbd> or drag & drop them. Paste Loom, YouTube, or Scribe video links to embed them.
      </p>
    </div>
  );
}
