import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Clipboard, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface ExportMenuProps {
  title: string;
  content: any;
  asDropdownItems?: boolean;
}

export function ExportMenu({ title, content, asDropdownItems = false }: ExportMenuProps) {
  const convertToMarkdown = (content: any): string => {
    if (!content?.content) return '';

    const processNode = (node: any): string => {
      switch (node.type) {
        case 'heading':
          const level = '#'.repeat(node.attrs?.level || 1);
          const headingText = node.content?.map((n: any) => n.text || '').join('') || '';
          return `${level} ${headingText}\n\n`;
        
        case 'paragraph':
          const paragraphText = node.content?.map((n: any) => {
            if (n.type === 'text') {
              let text = n.text || '';
              if (n.marks) {
                n.marks.forEach((mark: any) => {
                  if (mark.type === 'bold') text = `**${text}**`;
                  if (mark.type === 'italic') text = `*${text}*`;
                  if (mark.type === 'code') text = `\`${text}\``;
                  if (mark.type === 'strike') text = `~~${text}~~`;
                });
              }
              return text;
            }
            return '';
          }).join('') || '';
          return `${paragraphText}\n\n`;
        
        case 'bulletList':
          return node.content?.map((item: any) => 
            `- ${processNode(item).trim()}\n`
          ).join('') || '';
        
        case 'orderedList':
          return node.content?.map((item: any, i: number) => 
            `${i + 1}. ${processNode(item).trim()}\n`
          ).join('') || '';
        
        case 'taskList':
          return node.content?.map((item: any) => {
            const checked = item.attrs?.checked ? 'x' : ' ';
            const text = processNode(item).trim();
            return `- [${checked}] ${text}\n`;
          }).join('') || '';
        
        case 'listItem':
        case 'taskItem':
          return node.content?.map(processNode).join('').trim() || '';
        
        case 'blockquote':
          return node.content?.map((n: any) => 
            `> ${processNode(n).trim()}\n`
          ).join('') || '';
        
        case 'codeBlock':
          const code = node.content?.map((n: any) => n.text || '').join('') || '';
          return `\`\`\`\n${code}\n\`\`\`\n\n`;
        
        case 'image':
          return `![Image](${node.attrs?.src || ''})\n\n`;
        
        default:
          return '';
      }
    };

    return content.content.map(processNode).join('');
  };

  const handleExportMarkdown = () => {
    const markdown = convertToMarkdown(content);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'note'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Note exported as Markdown');
  };

  const handleCopyToClipboard = async () => {
    const markdown = convertToMarkdown(content);
    await navigator.clipboard.writeText(markdown);
    toast.success('Copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Opening print dialog...');
  };

  if (asDropdownItems) {
    return (
      <>
        <DropdownMenuItem onClick={handleExportMarkdown}>
          <FileDown className="h-4 w-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <FileDown className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyToClipboard}>
          <Clipboard className="h-4 w-4 mr-2" />
          Copy to Clipboard
        </DropdownMenuItem>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportMarkdown}>
          <FileText className="h-4 w-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyToClipboard}>
          <Clipboard className="h-4 w-4 mr-2" />
          Copy to Clipboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
