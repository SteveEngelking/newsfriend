import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon,
  Image as ImageIcon, Undo, Redo, Quote, Minus,
  Table as TableIcon, Plus, Trash2, ArrowUp, ArrowDown,
  ArrowLeft, ArrowRight, ExternalLink,
} from 'lucide-react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

interface Props {
  content: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'border-collapse w-full' } }),
      TableRow,
      TableCell.configure({ HTMLAttributes: { class: 'border border-border p-2' } }),
      TableHeader.configure({ HTMLAttributes: { class: 'border border-border p-2 bg-muted font-semibold' } }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const ToolBtn = ({ onClick, active, children, title, disabled }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string; disabled?: boolean }) => (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </Button>
  );

  return (
    <div className="border border-input rounded-md">
      <div className="flex flex-wrap gap-1 p-2 bg-muted/30 border-b border-input sticky top-14 z-10 rounded-t-md backdrop-blur-sm bg-muted/80">
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
        <TablePopover editor={editor} />

        <div className="w-px bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="h-4 w-4" />
        </ToolBtn>
      </div>

      <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none p-4 min-h-[200px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px] [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_th]:font-semibold" />
    </div>
  );
}

function LinkPopover({ editor }: { editor: any }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [openInNew, setOpenInNew] = useState(true);
  const [open, setOpen] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      const attrs = editor.getAttributes('link');
      setUrl(attrs.href || '');
      setOpenInNew(attrs.target === '_blank');
      const { from, to } = editor.state.selection;
      setText(editor.state.doc.textBetween(from, to, ''));
    }
    setOpen(isOpen);
  };

  const addLink = () => {
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({
        href: url,
        target: openInNew ? '_blank' : null,
        rel: openInNew ? 'noopener noreferrer' : null,
      }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setOpen(false);
    setUrl('');
    setText('');
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
    setOpen(false);
    setUrl('');
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant={editor.isActive('link') ? 'default' : 'outline'} size="icon" className="h-8 w-8" title="Link">
          <LinkIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">URL</Label>
          <Input placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={openInNew} onCheckedChange={setOpenInNew} id="link-target" />
          <Label htmlFor="link-target" className="text-xs flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> Open in new tab
          </Label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={addLink} className="flex-1">Apply</Button>
          {editor.isActive('link') && (
            <Button size="sm" variant="destructive" onClick={removeLink}>Remove</Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ImagePopover({ editor }: { editor: any }) {
  const [url, setUrl] = useState('');
  const [width, setWidth] = useState('');
  const [alt, setAlt] = useState('');
  const [open, setOpen] = useState(false);

  const addImage = () => {
    if (url) {
      const attrs: any = { src: url };
      if (alt) attrs.alt = alt;
      if (width) attrs.style = `width: ${width}`;
      editor.chain().focus().setImage(attrs).run();
    }
    setOpen(false);
    setUrl('');
    setWidth('');
    setAlt('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" title="Image">
          <ImageIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">Image URL</Label>
          <Input placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Alt text</Label>
          <Input placeholder="Description..." value={alt} onChange={e => setAlt(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Width (e.g. 300px, 50%)</Label>
          <Input placeholder="auto" value={width} onChange={e => setWidth(e.target.value)} onKeyDown={e => e.key === 'Enter' && addImage()} />
        </div>
        <Button size="sm" onClick={addImage} className="w-full">Insert Image</Button>
      </PopoverContent>
    </Popover>
  );
}

function TablePopover({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState('3');
  const [cols, setCols] = useState('3');
  const isInTable = editor.isActive('table');

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: parseInt(rows) || 3, cols: parseInt(cols) || 3, withHeaderRow: true }).run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant={isInTable ? 'default' : 'outline'} size="icon" className="h-8 w-8" title="Table">
          <TableIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        {isInTable ? (
          <div className="space-y-2">
            <p className="text-xs font-medium">Edit Table</p>
            <div className="grid grid-cols-2 gap-1">
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { editor.chain().focus().addColumnBefore().run(); }}>
                <ArrowLeft className="h-3 w-3" /> Col Before
              </Button>
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { editor.chain().focus().addColumnAfter().run(); }}>
                Col After <ArrowRight className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { editor.chain().focus().addRowBefore().run(); }}>
                <ArrowUp className="h-3 w-3" /> Row Before
              </Button>
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { editor.chain().focus().addRowAfter().run(); }}>
                Row After <ArrowDown className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="text-xs text-destructive gap-1" onClick={() => { editor.chain().focus().deleteColumn().run(); }}>
                <Trash2 className="h-3 w-3" /> Del Col
              </Button>
              <Button size="sm" variant="outline" className="text-xs text-destructive gap-1" onClick={() => { editor.chain().focus().deleteRow().run(); }}>
                <Trash2 className="h-3 w-3" /> Del Row
              </Button>
            </div>
            <Button size="sm" variant="destructive" className="w-full text-xs" onClick={() => { editor.chain().focus().deleteTable().run(); setOpen(false); }}>
              Delete Table
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium">Insert Table</p>
            <div className="flex gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Rows</Label>
                <Input type="number" min="1" max="20" value={rows} onChange={e => setRows(e.target.value)} className="h-8 w-16 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Columns</Label>
                <Input type="number" min="1" max="10" value={cols} onChange={e => setCols(e.target.value)} className="h-8 w-16 text-sm" />
              </div>
            </div>
            <Button size="sm" onClick={insertTable} className="w-full">
              <Plus className="h-3 w-3 mr-1" /> Insert Table
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
