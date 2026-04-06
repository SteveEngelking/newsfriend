import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon,
  Image as ImageIcon, Undo, Redo, Quote, Minus,
} from 'lucide-react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  content: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const ToolBtn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="border border-input rounded-md overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 bg-muted/30 border-b border-input">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
          <Heading3 className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List">
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
          <Quote className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          <Minus className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
          <AlignRight className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px bg-border mx-1" />

        <LinkPopover editor={editor} />
        <ImagePopover editor={editor} />

        <div className="w-px bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="h-4 w-4" />
        </ToolBtn>
      </div>

      <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none p-4 min-h-[200px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px]" />
    </div>
  );
}

function LinkPopover({ editor }: { editor: any }) {
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);

  const addLink = () => {
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setOpen(false);
    setUrl('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant={editor.isActive('link') ? 'default' : 'outline'} size="icon" className="h-8 w-8" title="Link">
          <LinkIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="flex gap-2">
          <Input placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()} />
          <Button size="sm" onClick={addLink}>Add</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ImagePopover({ editor }: { editor: any }) {
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);

  const addImage = () => {
    if (url) editor.chain().focus().setImage({ src: url }).run();
    setOpen(false);
    setUrl('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" title="Image">
          <ImageIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="flex gap-2">
          <Input placeholder="Image URL..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addImage()} />
          <Button size="sm" onClick={addImage}>Add</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
