import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { MentionList } from './MentionList';
import { LinkDialog } from './LinkDialog';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/hooks/useTeam';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  CheckSquare,
  Quote,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon
} from 'lucide-react';
import { uploadPastedImage } from '@/lib/imageUpload';
import { useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Mark } from '@tiptap/core';

interface RichTextEditorProps {
  content: any;
  onChange: (content: any) => void;
  placeholder?: string;
  noteId: string;
}

// Custom extension to highlight [bracketed instructions]
const BracketHighlight = Mark.create({
  name: 'bracketHighlight',
  
  parseHTML() {
    return [
      {
        tag: 'span[data-bracket-instruction]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, class: 'bg-primary/10 text-primary/80 px-1 rounded', 'data-bracket-instruction': '' }, 0];
  },
});

export function RichTextEditor({ content, onChange, placeholder, noteId }: RichTextEditorProps) {
  const { team } = useTeam();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      BracketHighlight,
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: {
          items: async ({ query }) => {
            if (!team?.id) return [];
            
            // First, get user_ids from team_members
            const { data: members, error: membersError } = await supabase
              .from('team_members')
              .select('user_id')
              .eq('team_id', team.id);
            
            if (membersError || !members || members.length === 0) return [];
            
            const userIds = members.map(m => m.user_id);
            
            // Then, get profiles for those user_ids
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url')
              .in('id', userIds);
            
            if (profilesError || !profiles) return [];
            
            if (!query) return profiles;
            
            return profiles.filter(p =>
              p.full_name?.toLowerCase().includes(query.toLowerCase()) ||
              p.email?.toLowerCase().includes(query.toLowerCase())
            );
          },
          render: () => {
            let component: ReactRenderer<any>;
            let popup: any;

            return {
              onStart: (props: any) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },

              onUpdate(props: any) {
                component.updateProps(props);

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },

              onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }
                // Let MentionList component handle keyboard navigation internally
                return false;
              },

              onExit() {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        },
      }),
    ],
    content: content || { type: 'doc', content: [] },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[500px] focus:outline-none',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const toastId = toast.loading('Uploading image...');
              
              Promise.race([
                uploadPastedImage(file, noteId),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Upload timeout - please try again')), 45000)
                )
              ])
                .then((result: any) => {
                  editor?.chain().focus().setImage({ src: result.publicUrl }).run();
                  toast.success('Image uploaded successfully', { id: toastId });
                })
                .catch((error) => {
                  console.error('Image paste error:', error);
                  const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
                  toast.error(errorMessage, { id: toastId });
                });
            }
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // Highlight [bracketed instructions] as user types
      const json = editor.getJSON();
      onChange(json);
    },
  });

  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
    setShowLinkDialog(true);
  }, [editor]);

  const handleLinkSubmit = useCallback((url: string) => {
    if (!editor) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Add https:// if no protocol specified
    const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
  }, [editor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const toastId = toast.loading('Uploading image...');
    
    try {
      const result = await Promise.race([
        uploadPastedImage(file, noteId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout - please try again')), 45000)
        )
      ]) as any;
      
      editor?.chain().focus().setImage({ src: result.publicUrl }).run();
      toast.success('Image uploaded successfully', { id: toastId });
    } catch (error) {
      console.error('Image upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      toast.error(errorMessage, { id: toastId });
    } finally {
      e.target.value = '';
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="relative space-y-3">
      {/* Permanent Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 p-2 bg-muted/50 backdrop-blur border rounded-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-active={editor.isActive('bold')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-active={editor.isActive('italic')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          data-active={editor.isActive('underline')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          data-active={editor.isActive('heading', { level: 1 })}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          data-active={editor.isActive('heading', { level: 2 })}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-active={editor.isActive('bulletList')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-active={editor.isActive('orderedList')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          data-active={editor.isActive('taskList')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Task List"
        >
          <CheckSquare className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-active={editor.isActive('blockquote')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={setLink}
          data-active={editor.isActive('link')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          data-active={editor.isActive({ textAlign: 'left' })}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          data-active={editor.isActive({ textAlign: 'center' })}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          data-active={editor.isActive({ textAlign: 'right' })}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => document.getElementById('image-upload-' + noteId)?.click()}
          className="h-8 w-8 p-0"
          title="Upload image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input
          id={'image-upload-' + noteId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      <EditorContent editor={editor} />
      
      <LinkDialog
        isOpen={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        onSubmit={handleLinkSubmit}
        defaultValue={linkUrl}
      />
    </div>
  );
}
