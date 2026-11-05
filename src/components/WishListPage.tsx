import React, { useState, useEffect, useRef, useId, useCallback } from 'react'
import { supabase, WishList, WishItem, ListFolder, withPurchaseStatus, loadWishItems } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { canTrackPurchases } from '../lib/purchaseVisibility'
import { formatPrice, parsePrice, sortByPriceLowToHigh } from '../lib/pricing'
import { ExternalLink, Check, ShoppingCart, Gift, Plus, GripVertical, Edit2, ChevronUp, ChevronDown, Star, Folder, FolderPlus, CandyCane, Globe2, LockKeyhole, RefreshCw, Trash2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import styles from '../styles/WishListPage.module.css'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableItemProps {
  item: WishItem
  canEdit: boolean
  hidePurchaseStatus: boolean
  allowReorder: boolean
  onToggleBought: (item: WishItem) => void
  onEdit: (item: WishItem) => void
  onDelete: (item: WishItem) => void
  onMoveUp: (item: WishItem) => void
  onMoveDown: (item: WishItem) => void
  onToggleStarred: (item: WishItem) => void
  isEditing: boolean
  editName: string
  editLink: string
  editDetails: string
  editPrice: string
  onEditNameChange: (value: string) => void
  onEditLinkChange: (value: string) => void
  onEditDetailsChange: (value: string) => void
  onEditPriceChange: (value: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  isMoving: boolean
}

interface FolderPickerProps {
  folders: ListFolder[]
  value: string
  onChange: (value: string) => void
}

const FolderPicker: React.FC<FolderPickerProps> = ({ folders, value, onChange }) => {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const selectedFolder = folders.find(folder => folder.id === value)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open])

  return <div className={styles.folderPicker} ref={pickerRef} onKeyDown={(event) => {
    if (event.key === 'Escape') {
      setOpen(false)
      triggerRef.current?.focus()
    }
  }}>
    <span className={styles.fieldLabel}>Folder</span>
    <button
      ref={triggerRef}
      type="button"
      className={`${styles.folderPickerTrigger} ${open ? styles.folderPickerTriggerOpen : ''}`}
      aria-label={`Folder: ${selectedFolder?.name || 'No folder'}. Choose folder`}
      aria-expanded={open}
      aria-controls={menuId}
      onClick={() => setOpen(current => !current)}
    >
      <span className={styles.folderPickerIcon}><Folder size={18} /></span>
      <span className={styles.folderPickerValue}>{selectedFolder?.name || 'No folder'}</span>
      <ChevronDown className={`${styles.folderPickerChevron} ${open ? styles.folderPickerChevronOpen : ''}`} size={18} />
    </button>
    {open && <div id={menuId} className={styles.folderPickerOptions}>
      <button type="button" className={styles.folderPickerOption} aria-pressed={!value}
        onClick={() => { onChange(''); setOpen(false); triggerRef.current?.focus() }}>
        <span className={styles.folderPickerOptionIcon}><Gift size={17} /></span>
        <span className={styles.folderPickerOptionText}><strong>No folder</strong><small>Keep in your main lists</small></span>
        {!value && <Check size={18} className={styles.folderPickerCheck} />}
      </button>
      {folders.map(folder => <button key={folder.id} type="button" className={styles.folderPickerOption}
        aria-pressed={value === folder.id}
        onClick={() => { onChange(folder.id); setOpen(false); triggerRef.current?.focus() }}>
        <span className={styles.folderPickerOptionIcon}><Folder size={17} /></span>
        <span className={styles.folderPickerOptionText}><strong>{folder.name}</strong></span>
        {value === folder.id && <Check size={18} className={styles.folderPickerCheck} />}
      </button>)}
    </div>}
  </div>
}

const VisibilityChoice: React.FC<{
  name: string
  isPublic: boolean
  onChange: (isPublic: boolean) => void
}> = ({ name, isPublic, onChange }) => <fieldset className={styles.visibilityFieldset}>
  <legend className={styles.fieldLabel}>Who can see this list?</legend>
  <div className={styles.visibilityOptions}>
    <label className={`${styles.visibilityOption} ${isPublic ? styles.visibilityOptionSelected : ''}`}>
      <input type="radio" name={name} checked={isPublic} onChange={() => onChange(true)} />
      <Globe2 size={18} aria-hidden="true" />
      <span><strong>Public</strong><small>Anyone signed in</small></span>
    </label>
    <label className={`${styles.visibilityOption} ${!isPublic ? styles.visibilityOptionSelected : ''}`}>
      <input type="radio" name={name} checked={!isPublic} onChange={() => onChange(false)} />
      <LockKeyhole size={18} aria-hidden="true" />
      <span><strong>Private</strong><small>Only you</small></span>
    </label>
  </div>
</fieldset>

const SortableItem: React.FC<SortableItemProps> = ({ 
  item, 
  canEdit,
  hidePurchaseStatus,
  allowReorder,
  onToggleBought, 
  onEdit, 
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleStarred,
  isEditing,
  editName,
  editLink,
  editDetails,
  editPrice,
  onEditNameChange,
  onEditLinkChange,
  onEditDetailsChange,
  onEditPriceChange,
  onSaveEdit,
  onCancelEdit,
  isMoving
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !allowReorder })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.itemCard} ${item.is_bought ? styles.itemCardBought : styles.itemCardUnbought} ${item.starred ? styles.itemCardStarred : ''} ${isMoving ? styles.itemCardMoving : ''}`}
    >
      <div className={styles.itemContent}>
        {isEditing ? (
          <div className={styles.editForm}>
            <input
              type="text"
              placeholder="Item name"
              aria-label="Item name"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              className={styles.input}
            />
            <input
              type="url"
              placeholder="Item link (optional)"
              aria-label="Item link"
              value={editLink}
              onChange={(e) => onEditLinkChange(e.target.value)}
              className={styles.input}
            />
            <input
              type="text"
              placeholder="Details (size, color, etc.)"
              aria-label="Item details"
              value={editDetails}
              onChange={(e) => onEditDetailsChange(e.target.value)}
              className={styles.input}
            />
            <input
              type="number"
              min="0"
              max="99999999.99"
              step="0.01"
              placeholder="Price in USD (optional)"
              aria-label="Item price in USD"
              value={editPrice}
              onChange={(e) => onEditPriceChange(e.target.value)}
              className={styles.input}
            />
            <div className={styles.buttonGroup}>
              <button
                onClick={onSaveEdit}
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className={`${styles.button} ${styles.buttonSecondary}`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.itemMain}>
            <div className={styles.itemRow}>
              {allowReorder && <button
                {...attributes}
                {...listeners}
                className={styles.dragHandle}
                title="Drag to reorder items by priority"
              >
                <GripVertical className={styles.boughtButtonIcon} />
              </button>}
              <div className={styles.itemInfo}>
                <h3 className={`${styles.itemName} ${item.is_bought ? styles.itemNameBought : styles.itemNameUnbought}`}>
                  {item.name}
                </h3>
                {item.details && (
                  <p className={styles.itemDetails}>
                    {item.details}
                  </p>
                )}
                {item.price !== null && (
                  <p className={styles.itemPrice}>{formatPrice(item.price)}</p>
                )}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.itemLink}
                  >
                    <ExternalLink className={styles.itemLinkIcon} />
                    View Link
                  </a>
                )}
              </div>
              <div className={styles.itemActions}>
                {canEdit && <button
                  onClick={() => onToggleStarred(item)}
                  className={`${styles.starButton} ${item.starred ? styles.starButtonStarred : styles.starButtonUnstarred}`}
                  title={item.starred ? 'Remove star' : 'Star this item'}
                >
                  <Star className={styles.starButtonIcon} />
                </button>}
                {allowReorder && <div className={styles.priorityButtons}>
                  <button
                    onClick={() => onMoveUp(item)}
                    className={styles.priorityButton}
                    title="Move up in priority"
                  >
                    <ChevronUp className={styles.priorityButtonIcon} />
                  </button>
                  <button
                    onClick={() => onMoveDown(item)}
                    className={styles.priorityButton}
                    title="Move down in priority"
                  >
                    <ChevronDown className={styles.priorityButtonIcon} />
                  </button>
                </div>}
                {canEdit && <button
                  onClick={() => onEdit(item)}
                  className={styles.editButton}
                  title="Edit item"
                >
                  <Edit2 className={styles.editButtonIcon} />
                </button>}
                {canEdit && <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className={styles.deleteItemButton}
                  aria-label={`Delete ${item.name}`}
                  title="Delete item"
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>}
                {!hidePurchaseStatus && <button
                  onClick={() => onToggleBought(item)}
                  className={`${styles.boughtButton} ${item.is_bought ? styles.boughtButtonBought : styles.boughtButtonUnbought}`}
                  title={item.is_bought ? 'Click to mark as not bought' : 'Click to mark as bought'}
                >
                  {item.is_bought ? (
                    <>
                      <Check className={styles.boughtButtonIcon} />
                      <span>Bought</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className={styles.boughtButtonIcon} />
                      <span>Mark as Bought</span>
                    </>
                  )}
                </button>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface DraggableListProps {
  list: WishList
  canMove: boolean
  onClick: () => void
  isSelected: boolean
  children: React.ReactNode
}

const DraggableList: React.FC<DraggableListProps> = ({ list, canMove, onClick, isSelected, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ 
    id: list.id,
    disabled: !canMove,
    data: {
      type: 'list',
      list,
    }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <div className={styles.listRow}>
        <div className={styles.listBody}>{children}</div>
        {canMove && <button
          {...attributes}
          {...listeners}
          type="button"
          className={styles.listDragHandle}
          aria-label={`Move ${list.name} to a folder`}
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical size={18} />
        </button>}
      </div>
    </div>
  )
}

interface DroppableFolderProps {
  folder: ListFolder
  children: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
}

const DroppableFolder: React.FC<DroppableFolderProps> = ({ folder, children, isExpanded, onToggle, onEdit }) => {
  const { setNodeRef, isOver } = useSortable({
    id: folder.id,
    data: {
      type: 'folder',
      folder,
    }
  })

  return (
    <div ref={setNodeRef} className={styles.folderContainer}>
      <div 
        className={`${styles.folderHeader} ${isOver ? styles.folderHeaderOver : ''}`}
        onClick={onToggle}
      >
        <div className={styles.folderTitle}>
          {isExpanded ? (
            <ChevronDown className={styles.folderIcon} />
          ) : (
            <ChevronUp className={styles.folderIcon} />
          )}
          <Folder className={styles.folderIcon} />
          <span>{folder.name}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className={styles.editListButton}
          title="Edit folder"
        >
          <Edit2 className={styles.editButtonIcon} />
        </button>
      </div>
      {isExpanded && children}
    </div>
  )
}

const DroppableAvailableLists: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setNodeRef, isOver } = useSortable({
    id: 'available-lists',
    data: { type: 'available-lists-area' } 
  });
  
  return (
    <div ref={setNodeRef} className={`${styles.availableListsArea} ${isOver ? styles.availableListsAreaOver : ''}`}>
      {children}
    </div>
  );
};

const WishListPage: React.FC = () => {
  const { member } = useAuth()
  const itemsSectionRef = useRef<HTMLDivElement>(null)
  const itemsRequestId = useRef(0)
  const [wishLists, setWishLists] = useState<WishList[]>([])
  const [folders, setFolders] = useState<ListFolder[]>([])
  const [selectedList, setSelectedList] = useState<WishList | null>(null)
  const [wishItems, setWishItems] = useState<WishItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState(false)
  const [purchaseStatusError, setPurchaseStatusError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddList, setShowAddList] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddFolder, setShowAddFolder] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListIsPublic, setNewListIsPublic] = useState(true)
  const [newFolderName, setNewFolderName] = useState('')
  const [newListIsChristmas, setNewListIsChristmas] = useState(false)
  const [newListFolderId, setNewListFolderId] = useState<string>('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemLink, setNewItemLink] = useState('')
  const [newItemDetails, setNewItemDetails] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [hasShownDragTip, setHasShownDragTip] = useState(false)
  const [editingItem, setEditingItem] = useState<WishItem | null>(null)
  const [editingList, setEditingList] = useState<WishList | null>(null)
  const [editingFolder, setEditingFolder] = useState<ListFolder | null>(null)
  const [editFolderName, setEditFolderName] = useState('')
  const [editItemName, setEditItemName] = useState('')
  const [editItemLink, setEditItemLink] = useState('')
  const [editItemDetails, setEditItemDetails] = useState('')
  const [editItemPrice, setEditItemPrice] = useState('')
  const [editListName, setEditListName] = useState('')
  const [editListIsPublic, setEditListIsPublic] = useState(true)
  const [editListIsChristmas, setEditListIsChristmas] = useState(false)
  const [editListFolderId, setEditListFolderId] = useState<string>('')
  const [movingItemId, setMovingItemId] = useState<string | null>(null)
  const [excludeBoughtLists, setExcludeBoughtLists] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [sortMode, setSortMode] = useState<'priority' | 'price'>('priority')
  const hidePurchaseStatus = !canTrackPurchases(selectedList?.owner_id ?? null, member?.id) || purchaseStatusError

  const selectList = (list: WishList) => {
    if (selectedList?.id !== list.id) {
      itemsRequestId.current += 1
      setWishItems([])
      setItemsLoading(true)
      setItemsError(false)
      setPurchaseStatusError(false)
    }
    setSelectedList(list)
    if (window.matchMedia?.('(max-width: 767px)').matches) {
      requestAnimationFrame(() => itemsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  const toggleExcludeBought = (listId: string) => {
    setExcludeBoughtLists(prev => {
      const newSet = new Set(prev)
      if (newSet.has(listId)) {
        newSet.delete(listId)
      } else {
        newSet.add(listId)
      }
      return newSet
    })
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  const fetchFolders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('list_folders')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setFolders(data || [])
      // Expand all folders by default
      setExpandedFolders(new Set(data?.map(f => f.id) || []))
    } catch (error) {
      console.error('Error fetching folders:', error)
    }
  }, [])

  const addFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const { data, error } = await supabase
        .from('list_folders')
        .insert([{ name: newFolderName.trim() }])
        .select()

      if (error) throw error
      setFolders([...folders, data[0]])
      setNewFolderName('')
      setShowAddFolder(false)
      setExpandedFolders(prev => new Set(prev).add(data[0].id))
    } catch (error) {
      console.error('Error adding folder:', error)
    }
  }

  const filteredWishItems = selectedList && excludeBoughtLists.has(selectedList.id)
    ? wishItems.filter(item => !item.is_bought)
    : wishItems
  const displayedWishItems = sortMode === 'price'
    ? sortByPriceLowToHigh(filteredWishItems)
    : filteredWishItems

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchWishLists = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('wish_lists')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setWishLists(data || [])
      setSelectedList(current => {
        if (!current) return null
        return (data || []).find(list => list.id === current.id) || null
      })
    } catch (error) {
      console.error('Error fetching wish lists:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchWishItems = useCallback(async (listId: string, ownerId: string | null) => {
    const requestId = ++itemsRequestId.current
    setItemsLoading(true)
    setItemsError(false)
    try {
      const result = await loadWishItems(listId, canTrackPurchases(ownerId ?? null, member?.id))
      if (requestId !== itemsRequestId.current) return
      setWishItems(result.items)
      setPurchaseStatusError(result.purchaseError)
    } catch (error) {
      if (requestId !== itemsRequestId.current) return
      console.error('Error fetching wish items:', error)
      setItemsError(true)
    } finally {
      if (requestId === itemsRequestId.current) setItemsLoading(false)
    }
  }, [member?.id])

  const selectedListId = selectedList?.id
  const selectedOwnerId = selectedList?.owner_id

  useEffect(() => {
    fetchWishLists()
    fetchFolders()
  }, [fetchWishLists, fetchFolders])

  useEffect(() => {
    if (!selectedListId) return
    fetchWishItems(selectedListId, selectedOwnerId ?? null)
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      fetchWishLists()
      fetchWishItems(selectedListId, selectedOwnerId ?? null)
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const interval = window.setInterval(refresh, 30000)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(interval)
    }
  }, [selectedListId, selectedOwnerId, fetchWishItems, fetchWishLists])

  const toggleItemBought = async (item: WishItem) => {
    if (hidePurchaseStatus) return
    try {
      const { error } = await supabase
        .from('wish_item_purchases')
        .update({ is_bought: !item.is_bought })
        .eq('item_id', item.id)
        .select('item_id')
        .single()

      if (error) throw error
      setWishItems(wishItems.map(i => 
        i.id === item.id ? { ...i, is_bought: !i.is_bought } : i
      ))
    } catch (error) {
      console.error('Error updating wish item:', error)
    }
  }

  const toggleItemStarred = async (item: WishItem) => {
    if (selectedList?.owner_id !== member?.id) return
    try {
      const { error } = await supabase
        .from('wish_items')
        .update({ starred: !item.starred })
        .eq('id', item.id)

      if (error) throw error

      setWishItems(wishItems.map(i => 
        i.id === item.id ? { ...i, starred: !i.starred } : i
      ))
    } catch (error) {
      console.error('Error updating wish item starred status:', error)
    }
  }

  const deleteWishItem = async (item: WishItem) => {
    if (!selectedList || selectedList.owner_id !== member?.id || item.wish_list_id !== selectedList.id) return
    if (!window.confirm(`Delete “${item.name}” from your list? This cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('wish_items')
        .delete()
        .eq('id', item.id)
        .eq('wish_list_id', selectedList.id)
        .select('id')
        .single()

      if (error) throw error
      setWishItems(items => items.filter(current => current.id !== item.id))
      toast.success('Item deleted')
    } catch (error) {
      console.error('Error deleting wish item:', error)
      toast.error('Could not delete this item. Please try again.')
    }
  }

  const addWishList = async () => {
    if (!newListName.trim() || !member) return

    try {
      const { data, error } = await supabase
        .from('wish_lists')
        .insert([{ 
          name: newListName.trim(),
          owner_id: member.id,
          is_public: newListIsPublic,
          is_christmas: newListIsChristmas,
          folder_id: newListFolderId || null
        }])
        .select()

      if (error) throw error
      setWishLists([data[0], ...wishLists])
      setNewListName('')
      setNewListIsPublic(true)
      setNewListIsChristmas(false)
      setNewListFolderId('')
      setShowAddList(false)
    } catch (error) {
      console.error('Error adding wish list:', error)
    }
  }

  const addWishItem = async () => {
    if (!newItemName.trim() || !selectedList || selectedList.owner_id !== member?.id) return
    const price = parsePrice(newItemPrice)
    if (price === undefined) {
      toast.error('Enter a valid price with up to two decimal places.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('wish_items')
        .insert([{
          wish_list_id: selectedList.id,
          name: newItemName.trim(),
          link: newItemLink.trim() || null,
          details: newItemDetails.trim() || null,
          price,
          priority: wishItems.length
        }])
        .select('*, wish_item_purchases(is_bought)')

      if (error) throw error
      setWishItems([...wishItems, withPurchaseStatus(data)[0]])
      setNewItemName('')
      setNewItemLink('')
      setNewItemDetails('')
      setNewItemPrice('')
      setShowAddItem(false)

      // Show drag-and-drop tip toast for the first item added
      if (!hasShownDragTip && wishItems.length === 0) {
        setHasShownDragTip(true)
        toast.success(
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-blue-600" />
            <span>💡 <strong>Tip:</strong> Drag items by the grip handle to reorder by priority!</span>
          </div>,
          {
            duration: 6000,
            position: 'top-center',
            style: {
              background: '#f0f9ff',
              border: '1px solid #0ea5e9',
              color: '#0c4a6e',
            },
          }
        )
      }
    } catch (error) {
      console.error('Error adding wish item:', error)
    }
  }

  const startEditFolder = (folder: ListFolder) => {
    setEditingFolder(folder)
    setEditFolderName(folder.name)
  }

  const saveEditFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) return

    try {
      const { error } = await supabase
        .from('list_folders')
        .update({ name: editFolderName.trim() })
        .eq('id', editingFolder.id)

      if (error) throw error

      setFolders(folders.map(f => 
        f.id === editingFolder.id 
          ? { ...f, name: editFolderName.trim() }
          : f
      ))
      setEditingFolder(null)
      setEditFolderName('')
    } catch (error) {
      console.error('Error updating folder:', error)
    }
  }

  const cancelEditFolder = () => {
    setEditingFolder(null)
    setEditFolderName('')
  }

  const startEditItem = (item: WishItem) => {
    if (selectedList?.owner_id !== member?.id) return
    setEditingItem(item)
    setEditItemName(item.name)
    setEditItemLink(item.link || '')
    setEditItemDetails(item.details || '')
    setEditItemPrice(item.price?.toString() ?? '')
  }

  const startEditList = (list: WishList) => {
    if (list.owner_id !== member?.id) return
    setEditingList(list)
    setEditListName(list.name)
    setEditListIsPublic(list.is_public)
    setEditListIsChristmas(list.is_christmas)
    setEditListFolderId(list.folder_id || '')
  }

  const saveEditItem = async () => {
    if (!editingItem || !editItemName.trim() || selectedList?.owner_id !== member?.id) return
    const price = parsePrice(editItemPrice)
    if (price === undefined) {
      toast.error('Enter a valid price with up to two decimal places.')
      return
    }

    try {
      const { error } = await supabase
        .from('wish_items')
        .update({
          name: editItemName.trim(),
          link: editItemLink.trim() || null,
          details: editItemDetails.trim() || null,
          price
        })
        .eq('id', editingItem.id)

      if (error) throw error

      // Update local state
      setWishItems(wishItems.map(item => 
        item.id === editingItem.id 
          ? { ...item, name: editItemName.trim(), link: editItemLink.trim() || null, details: editItemDetails.trim() || null, price }
          : item
      ))

      setEditingItem(null)
      setEditItemName('')
      setEditItemLink('')
      setEditItemDetails('')
      setEditItemPrice('')
    } catch (error) {
      console.error('Error updating wish item:', error)
    }
  }

  const saveEditList = async () => {
    if (!editingList || !editListName.trim() || editingList.owner_id !== member?.id) return

    try {
      const { error } = await supabase
        .from('wish_lists')
        .update({ 
          name: editListName.trim(),
          is_christmas: editListIsChristmas,
          folder_id: editListFolderId || null,
          is_public: editListIsPublic,
        })
        .eq('id', editingList.id)

      if (error) throw error

      // Update local state
      setWishLists(wishLists.map(list => 
        list.id === editingList.id 
          ? { ...list, name: editListName.trim(), is_public: editListIsPublic, is_christmas: editListIsChristmas, folder_id: editListFolderId || null }
          : list
      ))

      // Update selected list if it's the one being edited
      if (selectedList?.id === editingList.id) {
        setSelectedList({ ...selectedList, name: editListName.trim(), is_public: editListIsPublic, is_christmas: editListIsChristmas, folder_id: editListFolderId || null })
      }

      setEditingList(null)
      setEditListName('')
      setEditListIsPublic(true)
      setEditListIsChristmas(false)
      setEditListFolderId('')
    } catch (error) {
      console.error('Error updating wish list:', error)
    }
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setEditingList(null)
    setEditItemName('')
    setEditItemLink('')
    setEditItemDetails('')
    setEditItemPrice('')
    setEditListName('')
    setEditListIsPublic(true)
    setEditListIsChristmas(false)
    setEditListFolderId('')
  }

  const moveItemUp = async (item: WishItem) => {
    if (selectedList?.owner_id !== member?.id) return
    const currentIndex = wishItems.findIndex(i => i.id === item.id)
    if (currentIndex <= 0) return // Already at top

    // Start animation
    setMovingItemId(item.id)

    const newItems = [...wishItems]
    const temp = newItems[currentIndex]
    newItems[currentIndex] = newItems[currentIndex - 1]
    newItems[currentIndex - 1] = temp

    // Update priorities in database
    try {
      const updates = newItems.map((item, index) => ({
        id: item.id,
        priority: index
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('wish_items')
          .update({ priority: update.priority })
          .eq('id', update.id)
        
        if (error) throw error
      }

      setWishItems(newItems)
      
      // End animation after a short delay
      setTimeout(() => {
        setMovingItemId(null)
      }, 300)
    } catch (error) {
      console.error('Error moving item up:', error)
      setMovingItemId(null)
    }
  }

  const moveItemDown = async (item: WishItem) => {
    if (selectedList?.owner_id !== member?.id) return
    const currentIndex = wishItems.findIndex(i => i.id === item.id)
    if (currentIndex >= wishItems.length - 1) return // Already at bottom

    // Start animation
    setMovingItemId(item.id)

    const newItems = [...wishItems]
    const temp = newItems[currentIndex]
    newItems[currentIndex] = newItems[currentIndex + 1]
    newItems[currentIndex + 1] = temp

    // Update priorities in database
    try {
      const updates = newItems.map((item, index) => ({
        id: item.id,
        priority: index
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('wish_items')
          .update({ priority: update.priority })
          .eq('id', update.id)
        
        if (error) throw error
      }

      setWishItems(newItems)
      
      // End animation after a short delay
      setTimeout(() => {
        setMovingItemId(null)
      }, 300)
    } catch (error) {
      console.error('Error moving item down:', error)
      setMovingItemId(null)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    // Track drag start for potential visual feedback
    if (event.active.data.current?.type === 'list') {
      // List drag started
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    // Handle List dropping into Folder
    if (active.data.current?.type === 'list' && over.data.current?.type === 'folder') {
      const listId = active.id as string
      const folderId = over.id as string
      const list = wishLists.find(l => l.id === listId)

      if (list && list.owner_id === member?.id && list.folder_id !== folderId) {
        // Update UI optimistic
        setWishLists(prev => prev.map(l => 
          l.id === listId ? { ...l, folder_id: folderId } : l
        ))
        
        // Expand folder
        setExpandedFolders(prev => new Set(prev).add(folderId))

        // Update DB
        try {
          const { error } = await supabase
            .from('wish_lists')
            .update({ folder_id: folderId })
            .eq('id', listId)

          if (error) throw error
        } catch (error) {
          console.error('Error moving list to folder:', error)
          // Revert
          fetchWishLists()
        }
      }
      return
    }
    
    // Handle List dropping out of Folder (drop on available lists area)
    if (active.data.current?.type === 'list' && over.id === 'available-lists') {
        const listId = active.id as string
        const list = wishLists.find(l => l.id === listId)

        if (list && list.owner_id === member?.id && list.folder_id) {
           // Update UI optimistic
           setWishLists(prev => prev.map(l => 
            l.id === listId ? { ...l, folder_id: null } : l
          ))

          // Update DB
          try {
            const { error } = await supabase
              .from('wish_lists')
              .update({ folder_id: null })
              .eq('id', listId)
  
            if (error) throw error
          } catch (error) {
            console.error('Error removing list from folder:', error)
            // Revert
            fetchWishLists()
          }
        }
        return
    }

    if (sortMode === 'price' || selectedList?.owner_id !== member?.id) return
    if (over && active.id !== over.id) {
      // Use filtered items for drag indices
      const oldIndex = filteredWishItems.findIndex(item => item.id === active.id)
      const newIndex = filteredWishItems.findIndex(item => item.id === over.id)
      
      if (oldIndex === -1 || newIndex === -1) return
      
      // Reorder the filtered items
      const newFilteredItems = arrayMove(filteredWishItems, oldIndex, newIndex)
      
      // If we're filtering, merge with bought items maintaining their relative order
      // Otherwise, just use the reordered items
      let newItems: WishItem[]
      if (selectedList && excludeBoughtLists.has(selectedList.id)) {
        // Get bought items in their current order
        const boughtItems = wishItems.filter(item => item.is_bought).sort((a, b) => a.priority - b.priority)
        // Combine: reordered unbought items first, then bought items
        newItems = [...newFilteredItems, ...boughtItems]
      } else {
        newItems = newFilteredItems
      }
      
      setWishItems(newItems)

      // Update priorities in the database
      const updates = newItems.map((item, index) => ({
        id: item.id,
        priority: index
      }))

      try {
        for (const update of updates) {
          await supabase
            .from('wish_items')
            .update({ priority: update.priority })
            .eq('id', update.id)
        }
      } catch (error) {
        console.error('Error updating priorities:', error)
        // Revert on error
        fetchWishItems(selectedList!.id, selectedList!.owner_id)
      }
    }
  }

  const renderListItemContent = (list: WishList) => {
    if (editingList?.id === list.id) {
      return (
        <div className={styles.editForm} onClick={(event) => event.stopPropagation()}>
          <p className={styles.formHeading}>Edit list</p>
          <label className={styles.fieldLabel} htmlFor={`edit-list-${list.id}`}>List name</label>
          <input
            id={`edit-list-${list.id}`}
            type="text"
            placeholder="List name"
            aria-label="List name"
            value={editListName}
            onChange={(e) => setEditListName(e.target.value)}
            className={styles.input}
          />
          <div className={styles.listFormOptions}>
            <FolderPicker folders={folders} value={editListFolderId} onChange={setEditListFolderId} />
            <label className={styles.listTypeToggle}>
              <input
                type="checkbox"
                checked={editListIsChristmas}
                onChange={(e) => setEditListIsChristmas(e.target.checked)}
                className={styles.listTypeCheckbox}
              />
              <span className={styles.listTypeIcon}><CandyCane size={18} /></span>
              <span className={styles.listTypeText}>Christmas list</span>
              <span className={styles.listTypeSwitch} aria-hidden="true" />
            </label>
          </div>
          <VisibilityChoice name={`edit-list-visibility-${list.id}`} isPublic={editListIsPublic} onChange={setEditListIsPublic} />
          <div className={styles.buttonGroup}>
            <button
              onClick={saveEditList}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.listItemContent} onClick={() => {}}>
        <div className={styles.listItemHeader}>
          <span className={styles.listItemName}>
            {list.name}
            {list.is_christmas && (
              <span title="Christmas List">
                <CandyCane className={styles.christmasIcon} />
              </span>
            )}
          </span>
          {list.owner_id === member?.id && <button
            onClick={(e) => {
              e.stopPropagation()
              startEditList(list)
            }}
            className={styles.editListButton}
            title="Edit list"
          >
            <Edit2 className={styles.editButtonIcon} />
          </button>}
        </div>
        <span className={`${styles.visibilityBadge} ${list.is_public ? styles.visibilityBadgePublic : styles.visibilityBadgePrivate}`}>
          {list.is_public ? <Globe2 size={13} aria-hidden="true" /> : <LockKeyhole size={13} aria-hidden="true" />}
          {list.is_public ? 'Public · anyone signed in' : 'Private · only you'}
        </span>
        <p className={styles.listItemDate}>
          Created {new Date(list.created_at).toLocaleDateString()}
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading wish lists...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Toaster />
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Wish Lists</h1>
          <p className={styles.subtitle}>Keep ideas, links, and prices in one place.</p>
        </div>

        <div className={styles.grid}>
          {/* Wish Lists Section */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Lists <span className={styles.countBadge}>{wishLists.length}</span></h2>
              </div>
              <div className={styles.headerActions}>
                <button
                  onClick={() => setShowAddFolder(true)}
                  className={styles.addButton}
                  title="Create a new folder"
                >
                  <FolderPlus className={styles.addButtonIcon} />
                  Create Folder
                </button>
                <button
                  onClick={() => setShowAddList(true)}
                  className={styles.addButton}
                >
                  <Plus className={styles.addButtonIcon} />
                  Add List
                </button>
              </div>
            </div>

            {showAddFolder && (
              <div className={styles.addForm}>
                <p className={styles.formHeading}>New folder</p>
                <label className={styles.fieldLabel} htmlFor="new-folder-name">Folder name</label>
                <input
                  id="new-folder-name"
                  type="text"
                  placeholder="Folder name"
                  aria-label="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className={styles.input}
                />
                <div className={styles.buttonGroup}>
                  <button
                    onClick={addFolder}
                    disabled={!newFolderName.trim()}
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    Add Folder
                  </button>
                  <button
                    onClick={() => {
                      setShowAddFolder(false)
                      setNewFolderName('')
                    }}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showAddList && (
              <div className={styles.addForm}>
                <p className={styles.formHeading}>New list</p>
                <label className={styles.fieldLabel} htmlFor="new-list-name">List name</label>
                <input
                  id="new-list-name"
                  type="text"
                  placeholder="List name"
                  aria-label="List name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className={styles.input}
                />
                <div className={styles.listFormOptions}>
                  <FolderPicker folders={folders} value={newListFolderId} onChange={setNewListFolderId} />
                  <label className={styles.listTypeToggle}>
                    <input
                      type="checkbox"
                      checked={newListIsChristmas}
                      onChange={(e) => setNewListIsChristmas(e.target.checked)}
                      className={styles.listTypeCheckbox}
                    />
                    <span className={styles.listTypeIcon}><CandyCane size={18} /></span>
                    <span className={styles.listTypeText}>Christmas list</span>
                    <span className={styles.listTypeSwitch} aria-hidden="true" />
                  </label>
                </div>
                <VisibilityChoice name="new-list-visibility" isPublic={newListIsPublic} onChange={setNewListIsPublic} />
                <div className={styles.buttonGroup}>
                  <button
                    onClick={addWishList}
                    disabled={!newListName.trim()}
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    Create list
                  </button>
                  <button
                    onClick={() => {
                      setShowAddList(false)
                      setNewListName('')
                      setNewListIsPublic(true)
                      setNewListIsChristmas(false)
                      setNewListFolderId('')
                    }}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className={styles.listContainer}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
              <SortableContext items={folders.map(f => f.id)}>
              {/* Folders */}
              {folders.map(folder => (
                <DroppableFolder 
                  key={folder.id} 
                  folder={folder}
                  isExpanded={expandedFolders.has(folder.id)}
                  onToggle={() => toggleFolder(folder.id)}
                  onEdit={() => startEditFolder(folder)}
                >
                  {editingFolder?.id === folder.id ? (
                    <div className={styles.editForm}>
                      <input
                        type="text"
                        placeholder="Folder name"
                        aria-label="Folder name"
                        value={editFolderName}
                        onChange={(e) => setEditFolderName(e.target.value)}
                        className={styles.input}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className={styles.buttonGroup}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            saveEditFolder()
                          }}
                          className={`${styles.button} ${styles.buttonPrimary}`}
                        >
                          Save
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            cancelEditFolder()
                          }}
                          className={`${styles.button} ${styles.buttonSecondary}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.folderContent}>
                      <SortableContext items={wishLists.filter(list => list.folder_id === folder.id).map(l => l.id)}>
                      {wishLists.filter(list => list.folder_id === folder.id).map(list => (
                        <DraggableList
                          key={list.id}
                          list={list}
                          canMove={list.owner_id === member?.id}
                          onClick={() => selectList(list)}
                          isSelected={selectedList?.id === list.id}
                        >
                          {renderListItemContent(list)}
                        </DraggableList>
                      ))}
                      </SortableContext>
                      {wishLists.filter(list => list.folder_id === folder.id).length === 0 && (
                        <p className={styles.emptyFolder}>No lists in this folder</p>
                      )}
                    </div>
                  )}
                </DroppableFolder>
              ))}
              </SortableContext>
              
              <DroppableAvailableLists>
              {/* Uncategorized Lists */}
              <SortableContext items={wishLists.filter(list => !list.folder_id).map(l => l.id)}>
              {wishLists.filter(list => !list.folder_id).map(list => (
                <DraggableList
                  key={list.id}
                  list={list}
                  canMove={list.owner_id === member?.id}
                  onClick={() => selectList(list)}
                  isSelected={selectedList?.id === list.id}
                >
                  {renderListItemContent(list)}
                </DraggableList>
              ))}
              </SortableContext>
              </DroppableAvailableLists>

              {wishLists.length === 0 && (
                <div className={styles.emptyState}>
                  <Gift className={styles.emptyStateIcon} />
                  <strong>Every great gift starts with an idea.</strong>
                  <p>Create your first list and start collecting wishes.</p>
                  <button type="button" className={styles.emptyAction} onClick={() => setShowAddList(true)}>Create a list</button>
                </div>
              )}
              </DndContext>
            </div>
          </div>

          {/* Wish Items Section */}
          <div ref={itemsSectionRef} className={`${styles.card} ${styles.itemsCard}`}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>
                  {selectedList ? selectedList.name : 'Choose a list'}
                </h2>
              </div>
              {selectedList && (
                <div className={styles.cardHeaderActions}>
                  <label className={styles.sortLabel} htmlFor="item-sort">Sort items</label>
                  <select
                    id="item-sort"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as 'priority' | 'price')}
                    className={styles.sortSelect}
                  >
                    <option value="priority">Priority</option>
                    <option value="price">Price: low to high</option>
                  </select>
                  <button
                    type="button"
                    className={styles.refreshButton}
                    onClick={() => { fetchWishLists(); fetchWishItems(selectedList.id, selectedList.owner_id) }}
                    disabled={itemsLoading}
                    aria-label="Refresh list items"
                    title="Refresh list items"
                  >
                    <RefreshCw size={17} aria-hidden="true" />
                    <span>Refresh</span>
                  </button>
                  {!hidePurchaseStatus && <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={excludeBoughtLists.has(selectedList.id)}
                      onChange={() => toggleExcludeBought(selectedList.id)}
                      className={styles.toggleCheckbox}
                    />
                    <span className={styles.toggleText}>Hide bought items</span>
                  </label>}
                  {selectedList.owner_id === member?.id && <button
                    onClick={() => setShowAddItem(true)}
                    className={styles.addButton}
                  >
                    <Plus className={styles.addButtonIcon} />
                    Add Item
                  </button>}
                </div>
              )}
            </div>
            
            {!selectedList && (
              <div className={styles.emptyState}>
                <Gift className={styles.emptyStateIcon} />
                <p>Select a wish list to view its items</p>
              </div>
            )}

            {selectedList && selectedList.owner_id === member?.id && showAddItem && (
              <div className={styles.addForm}>
                <input
                  type="text"
                  placeholder="Item name"
                  aria-label="Item name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className={styles.input}
                />
                <input
                  type="url"
                  placeholder="Item link (optional)"
                  aria-label="Item link"
                  value={newItemLink}
                  onChange={(e) => setNewItemLink(e.target.value)}
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="Details (size, color, etc.)"
                  aria-label="Item details"
                  value={newItemDetails}
                  onChange={(e) => setNewItemDetails(e.target.value)}
                  className={styles.input}
                />
                <input
                  type="number"
                  min="0"
                  max="99999999.99"
                  step="0.01"
                  placeholder="Price in USD (optional)"
                  aria-label="Item price in USD"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className={styles.input}
                />
                <div className={styles.buttonGroup}>
                  <button
                    onClick={addWishItem}
                    disabled={!newItemName.trim()}
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    Add
                  </button>
                      <button
                    onClick={() => {
                      setShowAddItem(false)
                      setNewItemName('')
                      setNewItemLink('')
                      setNewItemDetails('')
                      setNewItemPrice('')
                    }}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {selectedList && (
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={displayedWishItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className={styles.itemContainer}>
                      {itemsLoading && wishItems.length === 0 && <p className={styles.itemsNotice} role="status">Loading items…</p>}
                      {itemsError && <div className={styles.itemsNotice} role="alert">
                        <p>Couldn't load this list's items.</p>
                        <button type="button" className={styles.refreshButton} onClick={() => fetchWishItems(selectedList.id, selectedList.owner_id)}>Try again</button>
                      </div>}
                      {displayedWishItems.map((item) => (
                      <SortableItem
                        key={item.id}
                        item={item}
                        canEdit={selectedList.owner_id === member?.id}
                        hidePurchaseStatus={hidePurchaseStatus}
                        allowReorder={sortMode === 'priority' && selectedList.owner_id === member?.id}
                        onToggleBought={toggleItemBought}
                        onEdit={startEditItem}
                        onDelete={deleteWishItem}
                        onMoveUp={moveItemUp}
                        onMoveDown={moveItemDown}
                        onToggleStarred={toggleItemStarred}
                        isEditing={editingItem?.id === item.id}
                        editName={editItemName}
                        editLink={editItemLink}
                        editDetails={editItemDetails}
                        editPrice={editItemPrice}
                        onEditNameChange={setEditItemName}
                        onEditLinkChange={setEditItemLink}
                        onEditDetailsChange={setEditItemDetails}
                        onEditPriceChange={setEditItemPrice}
                        onSaveEdit={saveEditItem}
                        onCancelEdit={cancelEdit}
                        isMoving={movingItemId === item.id}
                      />
                      ))}
                      {!itemsLoading && !itemsError && displayedWishItems.length === 0 && (
                        <div className={styles.emptyState}>
                          <GripVertical className={styles.emptyStateIcon} />
                          <p>{wishItems.length > 0 ? 'All items are hidden by your filter' : 'No items in this list yet'}</p>
                          <p className={styles.emptyStateText}>{wishItems.length > 0
                            ? 'Turn off Hide bought items to see everything.'
                            : selectedList.owner_id === member?.id ? 'Add items to this list' : 'Check again when the owner adds items.'}</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Summary */}
                {itemsLoading || itemsError ? null : purchaseStatusError
                  ? <p className={styles.emptyStateText}>Purchase tracking is temporarily unavailable. Refresh to try again.</p>
                  : hidePurchaseStatus
                  ? <p className={styles.emptyStateText}>Purchase tracking is hidden for this list.</p>
                  : <div className={styles.summaryCard}>
                  <h3 className={styles.summaryTitle}>Summary</h3>
                  <div className={styles.summaryGrid}>
                    <div className={`${styles.summaryItem} ${styles.summaryItemTotal}`}>
                      <div className={`${styles.summaryNumber} ${styles.summaryNumberTotal}`}>{wishItems.length}</div>
                      <div className={`${styles.summaryLabel} ${styles.summaryLabelTotal}`}>Total Items</div>
                    </div>
                    <div className={`${styles.summaryItem} ${styles.summaryItemBought}`}>
                      <div className={`${styles.summaryNumber} ${styles.summaryNumberBought}`}>
                        {wishItems.filter(item => item.is_bought).length}
                      </div>
                      <div className={`${styles.summaryLabel} ${styles.summaryLabelBought}`}>Bought</div>
                    </div>
                    <div className={`${styles.summaryItem} ${styles.summaryItemRemaining}`}>
                      <div className={`${styles.summaryNumber} ${styles.summaryNumberRemaining}`}>
                        {wishItems.filter(item => !item.is_bought).length}
                      </div>
                      <div className={`${styles.summaryLabel} ${styles.summaryLabelRemaining}`}>Remaining</div>
                    </div>
                  </div>
                </div>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WishListPage
