/**
 * Kanban Settings Modal
 * Allows users to configure, create, rename, and delete columns
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { type KanbanColumn } from '@/types/kanban-config.types';
import { getGmailLabels, type GmailLabel } from '@/lib/api/gmail-labels.api';
import { GMAIL_SYSTEM_LABELS } from '@/constants/constants.gmail';
import {
  Plus,
  Trash2,
  GripVertical,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

interface KanbanSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: KanbanColumn[];
  onAddColumn: (name: string, gmailLabel?: string) => Promise<any>;
  onUpdateColumn: (id: string, updates: Partial<KanbanColumn>) => Promise<void>;
  onDeleteColumn: (id: string) => Promise<void>;
  onReorderColumns: (columns: KanbanColumn[]) => Promise<void>;
  onResetToDefault: () => Promise<void>;
  isSyncing?: boolean;
}

export function KanbanSettingsModal({
  open,
  onOpenChange,
  columns,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onReorderColumns,
  onResetToDefault,
  isSyncing = false,
}: KanbanSettingsModalProps) {
  const [newColumnName, setNewColumnName] = useState('');
  const [newGmailLabel, setNewGmailLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingLabel, setEditingLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);
  const [labelValidation, setLabelValidation] = useState<string | null>(null);
  const [editLabelValidation, setEditLabelValidation] = useState<string | null>(
    null,
  );

  // Fetch available Gmail labels
  const { data: gmailLabels = [] } = useQuery<GmailLabel[]>({
    queryKey: ['gmail-labels'],
    queryFn: getGmailLabels,
    enabled: open,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter labels based on input
  const filteredLabels = gmailLabels.filter((label) =>
    label.name.toLowerCase().includes(newGmailLabel.toLowerCase().trim()),
  );

  // Filter labels for edit mode
  const filteredEditLabels = gmailLabels.filter((label) =>
    label.name.toLowerCase().includes(editingLabel.toLowerCase().trim()),
  );

  // Validate label on blur or when user stops typing (Add mode)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (newGmailLabel.trim()) {
        const trimmed = newGmailLabel.trim();

        // Check for duplicate label in existing columns
        const duplicateLabel = columns.find(
          (col) =>
            col.gmailLabel &&
            col.gmailLabel.toLowerCase() === trimmed.toLowerCase(),
        );
        if (duplicateLabel) {
          setLabelValidation(
            `❌ Label "${trimmed}" is already used by column "${duplicateLabel.name}"`,
          );
          return;
        }

        // Check if it's a known system label (these always exist)
        if (GMAIL_SYSTEM_LABELS.includes(trimmed.toUpperCase() as any)) {
          setLabelValidation(`✓ System label: ${trimmed.toUpperCase()}`);
          return;
        }

        // Check if label exists in Gmail
        const exactMatch = gmailLabels.find(
          (l) => l.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (exactMatch) {
          setLabelValidation(`✓ Label exists: ${exactMatch.name}`);
        } else {
          const suggestions = gmailLabels
            .filter((l) => l.name.toLowerCase().includes(trimmed.toLowerCase()))
            .slice(0, 3);
          if (suggestions.length > 0) {
            setLabelValidation(
              `⚠️ Label not found. Did you mean: ${suggestions
                .map((s) => s.name)
                .join(', ')}?`,
            );
          } else {
            setLabelValidation(
              `⚠️ Label "${newGmailLabel}" not found in Gmail. It will be used as-is.`,
            );
          }
        }
      } else {
        setLabelValidation(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newGmailLabel, gmailLabels, columns]);

  // Validate label on blur or when user stops typing (Edit mode)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editingLabel.trim() && editingId) {
        const trimmed = editingLabel.trim();

        // Check for duplicate label in existing columns (exclude current column)
        const duplicateLabel = columns.find(
          (col) =>
            col.id !== editingId &&
            col.gmailLabel &&
            col.gmailLabel.toLowerCase() === trimmed.toLowerCase(),
        );
        if (duplicateLabel) {
          setEditLabelValidation(
            `❌ Label "${trimmed}" is already used by column "${duplicateLabel.name}"`,
          );
          return;
        }

        // Check if it's a known system label (these always exist)
        if (GMAIL_SYSTEM_LABELS.includes(trimmed.toUpperCase() as any)) {
          setEditLabelValidation(`✓ System label: ${trimmed.toUpperCase()}`);
          return;
        }

        // Check if label exists in Gmail
        const exactMatch = gmailLabels.find(
          (l) => l.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (exactMatch) {
          setEditLabelValidation(`✓ Label exists: ${exactMatch.name}`);
        } else {
          const suggestions = gmailLabels
            .filter((l) => l.name.toLowerCase().includes(trimmed.toLowerCase()))
            .slice(0, 3);
          if (suggestions.length > 0) {
            setEditLabelValidation(
              `⚠️ Label not found. Did you mean: ${suggestions
                .map((s) => s.name)
                .join(', ')}?`,
            );
          } else {
            setEditLabelValidation(
              `⚠️ Label "${editingLabel}" not found in Gmail. It will be used as-is.`,
            );
          }
        }
      } else {
        setEditLabelValidation(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [editingLabel, editingId, gmailLabels, columns]);

  const showMessage = (type: 'success' | 'error' | 'warning', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim() || isAdding) return;

    // Client-side validation: Check for duplicate name (case-insensitive)
    const duplicateName = columns.find(
      (col) => col.name.toLowerCase() === newColumnName.trim().toLowerCase(),
    );
    if (duplicateName) {
      showMessage(
        'error',
        `Column name "${newColumnName.trim()}" is already used. Please choose a different name.`,
      );
      return;
    }

    // Client-side validation: Check for duplicate Gmail label (case-insensitive, skip empty)
    if (newGmailLabel.trim()) {
      const duplicateLabel = columns.find(
        (col) =>
          col.gmailLabel &&
          col.gmailLabel.toLowerCase() === newGmailLabel.trim().toLowerCase(),
      );
      if (duplicateLabel) {
        showMessage(
          'error',
          `Gmail label "${newGmailLabel.trim()}" is already used by column "${
            duplicateLabel.name
          }". Each label can only be assigned to one column.`,
        );
        return;
      }
    }

    setIsAdding(true);
    try {
      await onAddColumn(
        newColumnName.trim(),
        newGmailLabel.trim() || undefined,
      );
      setNewColumnName('');
      setNewGmailLabel('');
      setLabelValidation(null);
      showMessage('success', 'Column added successfully');
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to add column';
      showMessage('error', errorMsg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteColumn = async (columnId: string, columnName: string) => {
    if (!confirm(`Are you sure you want to delete column "${columnName}"?`)) {
      return;
    }
    try {
      await onDeleteColumn(columnId);
      showMessage('success', 'Column deleted successfully');
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete column';
      showMessage('error', errorMsg);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleStartEdit = (column: KanbanColumn) => {
    setEditingId(column.id);
    setEditingName(column.name);
    setEditingLabel(column.gmailLabel || '');
    setEditLabelValidation(null);
    setShowEditSuggestions(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editingName.trim()) {
      showMessage('error', 'Column name cannot be empty');
      return;
    }

    // Client-side validation: Check for duplicate name (exclude current column)
    const duplicateName = columns.find(
      (col) =>
        col.id !== editingId &&
        col.name.toLowerCase() === editingName.trim().toLowerCase(),
    );
    if (duplicateName) {
      showMessage(
        'error',
        `Column name "${editingName.trim()}" is already used. Please choose a different name.`,
      );
      return;
    }

    // Client-side validation: Check for duplicate Gmail label (exclude current column, skip empty)
    if (editingLabel.trim()) {
      const duplicateLabel = columns.find(
        (col) =>
          col.id !== editingId &&
          col.gmailLabel &&
          col.gmailLabel.toLowerCase() === editingLabel.trim().toLowerCase(),
      );
      if (duplicateLabel) {
        showMessage(
          'error',
          `Gmail label "${editingLabel.trim()}" is already used by column "${
            duplicateLabel.name
          }". Each label can only be assigned to one column.`,
        );
        return;
      }
    }

    try {
      await onUpdateColumn(editingId, {
        name: editingName.trim() || undefined,
        gmailLabel: editingLabel.trim() || undefined,
      });
      setEditingId(null);
      showMessage('success', 'Column updated successfully');
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update column';
      showMessage('error', errorMsg);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingLabel('');
    setEditLabelValidation(null);
    setShowEditSuggestions(false);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;

    const newColumns = [...columns];
    const [removed] = newColumns.splice(dragIndex, 1);
    newColumns.splice(dropIndex, 0, removed);

    try {
      await onReorderColumns(newColumns);
      showMessage('success', 'Columns reordered successfully');
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to reorder columns';
      showMessage('error', errorMsg);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='max-w-xl max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Kanban Board Settings</DialogTitle>
        </DialogHeader>

        {message && (
          <Alert
            variant={
              message.type === 'error'
                ? 'destructive'
                : message.type === 'warning'
                  ? 'default'
                  : 'default'
            }
          >
            {message.type === 'success' ? (
              <CheckCircle2 className='h-4 w-4' />
            ) : message.type === 'warning' ? (
              <Info className='h-4 w-4' />
            ) : (
              <AlertCircle className='h-4 w-4' />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className='space-y-6'>
          {/* Add New Column */}
          <div className='space-y-3 p-4 border rounded-lg bg-muted/30'>
            <h3 className='font-semibold text-sm'>Add New Column</h3>
            <div className='grid grid-cols-12 gap-3'>
              <div className='col-span-5'>
                <Label
                  htmlFor='column-name'
                  className='text-xs'
                >
                  Column Name
                </Label>
                <Input
                  id='column-name'
                  placeholder='e.g., Urgent'
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                />
              </div>
              <div className='col-span-5'>
                <Label
                  htmlFor='gmail-label'
                  className='text-xs'
                >
                  Gmail Label{' '}
                  <span className='text-muted-foreground'>
                    (optional - empty = archive)
                  </span>
                </Label>
                <div className='relative'>
                  <Input
                    id='gmail-label'
                    placeholder='e.g., INBOX, STARRED, IMPORTANT, or leave empty'
                    value={newGmailLabel}
                    onChange={(e) => {
                      setNewGmailLabel(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() =>
                      setTimeout(() => setShowSuggestions(false), 200)
                    }
                    title='System labels: INBOX, STARRED, IMPORTANT. Custom labels: use label name. Leave empty: archives email (removes INBOX).'
                  />
                  {/* Autocomplete dropdown */}
                  {showSuggestions &&
                    newGmailLabel.trim() &&
                    filteredLabels.length > 0 && (
                      <div className='absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto'>
                        {filteredLabels.slice(0, 10).map((label) => (
                          <div
                            key={label.id}
                            className='px-3 py-2 hover:bg-accent cursor-pointer text-sm'
                            onClick={() => {
                              setNewGmailLabel(label.name);
                              setShowSuggestions(false);
                            }}
                          >
                            <div className='font-medium'>{label.name}</div>
                            <div className='text-xs text-muted-foreground'>
                              {label.type === 'system'
                                ? 'System label'
                                : 'Custom label'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
                {/* Validation message */}
                {labelValidation && (
                  <p className='text-xs mt-1 text-muted-foreground flex items-center gap-1'>
                    <Info className='h-3 w-3' />
                    {labelValidation}
                  </p>
                )}
              </div>
              <div className='col-span-2 flex items-end'>
                <Button
                  onClick={handleAddColumn}
                  className='w-full'
                  disabled={isAdding || isSyncing}
                >
                  <Plus className='h-4 w-4 mr-1' />
                  {isAdding ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </div>

          {/* Existing Columns */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <h3 className='font-semibold text-sm'>Columns</h3>
              <Button
                variant='outline'
                size='sm'
                onClick={async () => {
                  if (
                    confirm(
                      'Reset all columns to default settings? This will remove all custom columns.',
                    )
                  ) {
                    try {
                      await onResetToDefault();
                      showMessage('success', 'Columns reset to default');
                    } catch (error: any) {
                      const errorMsg =
                        error?.response?.data?.message ||
                        error?.message ||
                        'Failed to reset columns';
                      showMessage('error', errorMsg);
                    }
                  }
                }}
              >
                Reset to Default
              </Button>
            </div>

            <div className='space-y-2'>
              {columns.map((column, index) => (
                <div
                  key={column.id}
                  draggable={editingId !== column.id}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`p-3 border rounded-lg bg-card transition-colors ${
                    editingId === column.id
                      ? ''
                      : 'cursor-move hover:bg-accent/50'
                  }`}
                >
                  {editingId === column.id ? (
                    <>
                      <div className='flex items-center gap-2'>
                        <GripVertical className='h-4 w-4 text-muted-foreground shrink-0' />
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className='flex-1'
                          autoFocus
                        />
                        <div className='relative flex-1'>
                          <Input
                            value={editingLabel}
                            onChange={(e) => {
                              setEditingLabel(e.target.value);
                              setShowEditSuggestions(true);
                            }}
                            onFocus={() => setShowEditSuggestions(true)}
                            onBlur={() =>
                              setTimeout(
                                () => setShowEditSuggestions(false),
                                200,
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            placeholder='Gmail label (empty = archive)'
                            title='System labels: INBOX, STARRED, IMPORTANT. Custom: label name. Empty: archives.'
                          />
                          {/* Autocomplete dropdown for edit mode */}
                          {showEditSuggestions &&
                            editingLabel.trim() &&
                            filteredEditLabels.length > 0 && (
                              <div className='absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto'>
                                {filteredEditLabels
                                  .slice(0, 10)
                                  .map((label) => (
                                    <div
                                      key={label.id}
                                      className='px-3 py-2 hover:bg-accent cursor-pointer text-sm'
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setEditingLabel(label.name);
                                        setShowEditSuggestions(false);
                                      }}
                                    >
                                      <div className='font-medium'>
                                        {label.name}
                                      </div>
                                      <div className='text-xs text-muted-foreground'>
                                        {label.type === 'system'
                                          ? 'System label'
                                          : 'Custom label'}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                        </div>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={handleSaveEdit}
                          disabled={!editingName.trim()}
                          title='Save (Enter)'
                        >
                          <CheckCircle2 className='h-4 w-4' />
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={handleCancelEdit}
                          title='Cancel (Esc)'
                        >
                          <X className='h-4 w-4' />
                        </Button>
                      </div>
                      {/* Edit mode validation message */}
                      {editLabelValidation && (
                        <p className='text-xs mt-1 ml-6 text-muted-foreground flex items-center gap-1'>
                          <Info className='h-3 w-3' />
                          {editLabelValidation}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className='flex items-center gap-2'>
                      <GripVertical className='h-4 w-4 text-muted-foreground shrink-0' />
                      <div className='flex-1 min-w-0'>
                        <div className='font-medium text-sm truncate'>
                          {column.name}
                        </div>
                        {column.gmailLabel && (
                          <div className='text-xs text-muted-foreground truncate'>
                            Label: {column.gmailLabel}
                          </div>
                        )}
                      </div>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleStartEdit(column)}
                      >
                        Edit
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() =>
                          handleDeleteColumn(column.id, column.name)
                        }
                        className='text-destructive hover:text-destructive'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className='text-xs text-muted-foreground space-y-1'>
            <p>• Drag columns to reorder them</p>
            <p>• Click "Edit" to rename a column or update its Gmail label</p>
            <p>• Press Enter to save changes, Esc to cancel</p>
            <p>
              • Gmail labels: Use system labels (STARRED, IMPORTANT) or custom
              label names from your Gmail
            </p>
            <p>
              • When you move a card to a column, the Gmail label will be
              automatically applied
            </p>
            <p>• Leave Gmail label empty if you don't want label syncing</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
