import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { EditorToolbar } from './EditorToolbar';
import { useEffect } from 'react';
import { MentionList, MentionListRef } from './MentionList';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { supabase } from '@/integrations/supabase/client';

interface RichTextPostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onImagePaste?: (file: File) => void;
  onMentionAdd?: (userId: string) => void;
}

export function RichTextPostEditor({ 
  value, 
  onChange, 
  placeholder = "What's on your mind?",
  onImagePaste,
  onMentionAdd
}: RichTextPostEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention bg-primary/10 text-primary px-1 rounded font-medium',
        },
        renderLabel({ options, node }) {
          return `@${node.attrs.label ?? node.attrs.id}`;
        },
        suggestion: {
          items: async ({ query }) => {
            const { data, error } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .ilike('full_name', `%${query}%`)
              .limit(10);
            return data || [];
          },
          render: () => {
            let component: ReactRenderer;
            let popup: any;

            return {
              onStart: (props: any) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

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

                if (!props.clientRect) {
                  return;
                }

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },

              onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }

                const ref = component.ref as MentionListRef | null;
                return ref?.onKeyDown?.(props) || false;
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
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      
      // Extract mentions and call callback
      if (onMentionAdd) {
        const mentionRegex = /data-id="([^"]+)"/g;
        let match;
        while ((match = mentionRegex.exec(html)) !== null) {
          onMentionAdd(match[1]);
        }
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] p-4',
      },
      handlePaste: (view, event) => {
        if (!onImagePaste) return false;
        
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = items[i].getAsFile();
            if (file) {
              onImagePaste(file);
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        if (!onImagePaste) return false;
        
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        for (let i = 0; i < files.length; i++) {
          if (files[i].type.indexOf('image') !== -1) {
            event.preventDefault();
            onImagePaste(files[i]);
            return true;
          }
        }
        return false;
      },
      handleDOMEvents: {
        dragover: (view, event) => {
          event.preventDefault();
          return false;
        },
      },
    },
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Listen for image selection from toolbar
  useEffect(() => {
    if (!onImagePaste) return;

    const handleImageSelected = (e: Event) => {
      const customEvent = e as CustomEvent;
      const file = customEvent.detail;
      if (file) {
        onImagePaste(file);
      }
    };

    window.addEventListener('imageSelected', handleImageSelected);
    return () => window.removeEventListener('imageSelected', handleImageSelected);
  }, [onImagePaste]);

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <EditorToolbar editor={editor} onImageClick={() => {}} />
      <EditorContent editor={editor} />
    </div>
  );
}
