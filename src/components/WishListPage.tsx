import React, { useState, useEffect } from 'react'
import { supabase, WishList, WishItem, ListFolder } from '../lib/supabase'
import { ExternalLink, Check, ShoppingCart, Gift, Plus, GripVertical, Edit2, ChevronUp, ChevronDown, Star, Folder, FolderPlus, CandyCane } from 'lucide-react'
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
  onToggleBought: (item: WishItem) => void
  onEdit: (item: WishItem) => void
  onMoveUp: (item: WishItem) => void
  onMoveDown: (item: WishItem) => void
  onToggleStarred: (item: WishItem) => void
  isEditing: boolean
  editName: string
  editLink: string
  editDetails: string
  onEditNameChange: (value: string) => void
  onEditLinkChange: (value: string) => void
  onEditDetailsChange: (value: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  isMoving: boolean
}

const SortableItem: React.FC<SortableItemProps> = ({ 
  item, 
  onToggleBought, 
  onEdit, 
  onMoveUp,
  onMoveDown,
  onToggleStarred,
  isEditing,
  editName,
  editLink,
  editDetails,
  onEditNameChange,
  onEditLinkChange,
  onEditDetailsChange,
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
  } = useSortable({ id: item.id })

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
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              className={styles.input}
            />
            <input
              type="url"
              placeholder="Item link (optional)"
              value={editLink}
              onChange={(e) => onEditLinkChange(e.target.value)}
              className={styles.input}
            />
            <input
              type="text"
              placeholder="Details (size, color, etc.)"
              value={editDetails}
              onChange={(e) => onEditDetailsChange(e.target.value)}
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
              <button
                {...attributes}
                {...listeners}
                className={styles.dragHandle}
                title="Drag to reorder items by priority"
              >
                <GripVertical className={styles.boughtButtonIcon} />
              </button>
              <div className={styles.itemInfo}>
                <h3 className={`${styles.itemName} ${item.is_bought ? styles.itemNameBought : styles.itemNameUnbought}`}>
                  {item.name}
                </h3>
                {item.details && (
                  <p className={styles.itemDetails}>
                    {item.details}
                  </p>
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
                <button
                  onClick={() => onToggleStarred(item)}
                  className={`${styles.starButton} ${item.starred ? styles.starButtonStarred : styles.starButtonUnstarred}`}
                  title={item.starred ? 'Remove star' : 'Star this item'}
                >
                  <Star className={styles.starButtonIcon} />
                </button>
                <div className={styles.priorityButtons}>
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
                </div>
                <button
                  onClick={() => onEdit(item)}
                  className={styles.editButton}
                  title="Edit item"
                >
                  <Edit2 className={styles.editButtonIcon} />
                </button>
                <button
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
                </button>
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
  onClick: () => void
  isSelected: boolean
  children: React.ReactNode
}

const DraggableList: React.FC<DraggableListProps> = ({ list, onClick, isSelected, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ 
    id: list.id,
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
      {...attributes}
      {...listeners}
      className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''}`}
      onClick={onClick}
    >
      {children}
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
  const { setNodeRef } = useSortable({ 
    id: 'available-lists',
    data: { type: 'available-lists-area' } 
  });
  
  return (
    <div ref={setNodeRef} className="min-h-[50px]">
      {children}
    </div>
  );
};

const WishListPage: React.FC = () => {
  const [wishLists, setWishLists] = useState<WishList[]>([])
  const [folders, setFolders] = useState<ListFolder[]>([])
  const [selectedList, setSelectedList] = useState<WishList | null>(null)
  const [wishItems, setWishItems] = useState<WishItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddList, setShowAddList] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddFolder, setShowAddFolder] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [newListIsChristmas, setNewListIsChristmas] = useState(false)
  const [newListFolderId, setNewListFolderId] = useState<string>('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemLink, setNewItemLink] = useState('')
  const [newItemDetails, setNewItemDetails] = useState('')
  const [hasShownDragTip, setHasShownDragTip] = useState(false)
  const [editingItem, setEditingItem] = useState<WishItem | null>(null)
  const [editingList, setEditingList] = useState<WishList | null>(null)
  const [editingFolder, setEditingFolder] = useState<ListFolder | null>(null)
  const [editFolderName, setEditFolderName] = useState('')
  const [editItemName, setEditItemName] = useState('')
  const [editItemLink, setEditItemLink] = useState('')
  const [editItemDetails, setEditItemDetails] = useState('')
  const [editListName, setEditListName] = useState('')
  const [editListIsChristmas, setEditListIsChristmas] = useState(false)
  const [editListFolderId, setEditListFolderId] = useState<string>('')
  const [movingItemId, setMovingItemId] = useState<string | null>(null)
  const [excludeBoughtLists, setExcludeBoughtLists] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

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

  const fetchFolders = async () => {
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
  }

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

  useEffect(() => {
    fetchWishLists()
    fetchFolders()
  }, [])

  useEffect(() => {
    if (selectedList) {
      fetchWishItems(selectedList.id)
    }
  }, [selectedList])

  const fetchWishLists = async () => {
    try {
      const { data, error } = await supabase
        .from('wish_lists')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setWishLists(data || [])
    } catch (error) {
      console.error('Error fetching wish lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWishItems = async (listId: string) => {
    try {
      const { data, error } = await supabase
        .from('wish_items')
        .select('*')
        .eq('wish_list_id', listId)
        .order('priority', { ascending: true })

      if (error) throw error
      setWishItems(data || [])
    } catch (error) {
      console.error('Error fetching wish items:', error)
    }
  }

  const toggleItemBought = async (item: WishItem) => {
    try {
      const { error } = await supabase
        .from('wish_items')
        .update({ is_bought: !item.is_bought })
        .eq('id', item.id)

      if (error) throw error
      setWishItems(wishItems.map(i => 
        i.id === item.id ? { ...i, is_bought: !i.is_bought } : i
      ))
    } catch (error) {
      console.error('Error updating wish item:', error)
    }
  }

  const toggleItemStarred = async (item: WishItem) => {
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

  const addWishList = async () => {
    if (!newListName.trim()) return

    try {
      const { data, error } = await supabase
        .from('wish_lists')
        .insert([{ 
          name: newListName.trim(),
          is_christmas: newListIsChristmas,
          folder_id: newListFolderId || null
        }])
        .select()

      if (error) throw error
      setWishLists([data[0], ...wishLists])
      setNewListName('')
      setNewListIsChristmas(false)
      setNewListFolderId('')
      setShowAddList(false)
    } catch (error) {
      console.error('Error adding wish list:', error)
    }
  }

  const addWishItem = async () => {
    if (!newItemName.trim() || !selectedList) return

    try {
      const { data, error } = await supabase
        .from('wish_items')
        .insert([{
          wish_list_id: selectedList.id,
          name: newItemName.trim(),
          link: newItemLink.trim() || null,
          details: newItemDetails.trim() || null,
          priority: wishItems.length
        }])
        .select()

      if (error) throw error
      setWishItems([data[0], ...wishItems])
      setNewItemName('')
      setNewItemLink('')
      setNewItemDetails('')
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
    setEditingItem(item)
    setEditItemName(item.name)
    setEditItemLink(item.link || '')
    setEditItemDetails(item.details || '')
  }

  const startEditList = (list: WishList) => {
    setEditingList(list)
    setEditListName(list.name)
    setEditListIsChristmas(list.is_christmas)
    setEditListFolderId(list.folder_id || '')
  }

  const saveEditItem = async () => {
    if (!editingItem || !editItemName.trim()) return

    try {
      const { error } = await supabase
        .from('wish_items')
        .update({
          name: editItemName.trim(),
          link: editItemLink.trim() || null,
          details: editItemDetails.trim() || null
        })
        .eq('id', editingItem.id)

      if (error) throw error

      // Update local state
      setWishItems(wishItems.map(item => 
        item.id === editingItem.id 
          ? { ...item, name: editItemName.trim(), link: editItemLink.trim() || null, details: editItemDetails.trim() || null }
          : item
      ))

      setEditingItem(null)
      setEditItemName('')
      setEditItemLink('')
      setEditItemDetails('')
    } catch (error) {
      console.error('Error updating wish item:', error)
    }
  }

  const saveEditList = async () => {
    if (!editingList || !editListName.trim()) return

    try {
      const { error } = await supabase
        .from('wish_lists')
        .update({ 
          name: editListName.trim(),
          is_christmas: editListIsChristmas,
          folder_id: editListFolderId || null
        })
        .eq('id', editingList.id)

      if (error) throw error

      // Update local state
      setWishLists(wishLists.map(list => 
        list.id === editingList.id 
          ? { ...list, name: editListName.trim(), is_christmas: editListIsChristmas, folder_id: editListFolderId || null }
          : list
      ))

      // Update selected list if it's the one being edited
      if (selectedList?.id === editingList.id) {
        setSelectedList({ ...selectedList, name: editListName.trim(), is_christmas: editListIsChristmas, folder_id: editListFolderId || null })
      }

      setEditingList(null)
      setEditListName('')
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
    setEditListName('')
    setEditListIsChristmas(false)
    setEditListFolderId('')
  }

  const moveItemUp = async (item: WishItem) => {
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

      if (list && list.folder_id !== folderId) {
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

        if (list && list.folder_id) {
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
        fetchWishItems(selectedList!.id)
      }
    }
  }

  const renderListItemContent = (list: WishList) => {
    if (editingList?.id === list.id) {
      return (
        <div className={styles.editForm}>
          <input
            type="text"
            placeholder="List name"
            value={editListName}
            onChange={(e) => setEditListName(e.target.value)}
            className={styles.input}
          />
          <div className={styles.formRow}>
            <select
              value={editListFolderId}
              onChange={(e) => setEditListFolderId(e.target.value)}
              className={styles.select}
            >
              <option value="">No Folder</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={editListIsChristmas}
                onChange={(e) => setEditListIsChristmas(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>Christmas List</span>
            </label>
          </div>
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
                <CandyCane className={`${styles.christmasIcon} text-red-500 ml-2 h-4 w-4 inline`} />
              </span>
            )}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              startEditList(list)
            }}
            className={styles.editListButton}
            title="Edit list"
          >
            <Edit2 className={styles.editButtonIcon} />
          </button>
        </div>
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
          <div className={styles.iconContainer}>
            <Gift className={styles.icon} />
          </div>
          <h1 className={styles.title}>Wish Lists</h1>
          <p className={styles.subtitle}>Browse and manage your wish lists</p>
        </div>

        <div className={styles.grid}>
          {/* Wish Lists Section */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Available Lists</h2>
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
                <input
                  type="text"
                  placeholder="Folder name"
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
                <input
                  type="text"
                  placeholder="List name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className={styles.input}
                />
                <div className={styles.formRow}>
                  <select
                    value={newListFolderId}
                    onChange={(e) => setNewListFolderId(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">No Folder</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newListIsChristmas}
                      onChange={(e) => setNewListIsChristmas(e.target.checked)}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkboxText}>Christmas List</span>
                  </label>
                </div>
                <div className={styles.buttonGroup}>
                  <button
                    onClick={addWishList}
                    disabled={!newListName.trim()}
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddList(false)
                      setNewListName('')
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
                          onClick={() => setSelectedList(list)}
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
                  onClick={() => setSelectedList(list)}
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
                  <p>No wish lists available yet</p>
                </div>
              )}
              </DndContext>
            </div>
          </div>

          {/* Wish Items Section */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                {selectedList ? `${selectedList.name} Items` : 'Select a List'}
              </h2>
              {selectedList && (
                <div className={styles.cardHeaderActions}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={excludeBoughtLists.has(selectedList.id)}
                      onChange={() => toggleExcludeBought(selectedList.id)}
                      className={styles.toggleCheckbox}
                    />
                    <span className={styles.toggleText}>Hide bought items</span>
                  </label>
                  <button
                    onClick={() => setShowAddItem(true)}
                    className={styles.addButton}
                  >
                    <Plus className={styles.addButtonIcon} />
                    Add Item
                  </button>
                </div>
              )}
            </div>
            
            {!selectedList && (
              <div className={styles.emptyState}>
                <Gift className={styles.emptyStateIcon} />
                <p>Select a wish list to view its items</p>
              </div>
            )}

            {selectedList && showAddItem && (
              <div className={styles.addForm}>
                <input
                  type="text"
                  placeholder="Item name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className={styles.input}
                />
                <input
                  type="url"
                  placeholder="Item link (optional)"
                  value={newItemLink}
                  onChange={(e) => setNewItemLink(e.target.value)}
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="Details (size, color, etc.)"
                  value={newItemDetails}
                  onChange={(e) => setNewItemDetails(e.target.value)}
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
                    items={filteredWishItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className={styles.itemContainer}>
                      {filteredWishItems.map((item) => (
                      <SortableItem
                        key={item.id}
                        item={item}
                        onToggleBought={toggleItemBought}
                        onEdit={startEditItem}
                        onMoveUp={moveItemUp}
                        onMoveDown={moveItemDown}
                        onToggleStarred={toggleItemStarred}
                        isEditing={editingItem?.id === item.id}
                        editName={editItemName}
                        editLink={editItemLink}
                        editDetails={editItemDetails}
                        onEditNameChange={setEditItemName}
                        onEditLinkChange={setEditItemLink}
                        onEditDetailsChange={setEditItemDetails}
                        onSaveEdit={saveEditItem}
                        onCancelEdit={cancelEdit}
                        isMoving={movingItemId === item.id}
                      />
                      ))}
                      {filteredWishItems.length === 0 && (
                        <div className={styles.emptyState}>
                          <GripVertical className={styles.emptyStateIcon} />
                          <p>No items in this list yet</p>
                          <p className={styles.emptyStateText}>Add items and drag to reorder by priority</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Summary */}
                <div className={styles.summaryCard}>
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
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WishListPage
