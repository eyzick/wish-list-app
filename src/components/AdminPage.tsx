import React, { useState, useEffect } from 'react'
import { supabase, WishList, WishItem, ListFolder } from '../lib/supabase'
import { Trash2, ExternalLink, Check, ShoppingCart, GripVertical, Folder, ChevronDown, ChevronUp, CandyCane } from 'lucide-react'
import styles from '../styles/AdminPage.module.css'
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

interface AdminSortableItemProps {
  item: WishItem
  onToggleBought: (item: WishItem) => void
  onDelete: (id: string) => void
}

const AdminSortableItem: React.FC<AdminSortableItemProps> = ({ item, onToggleBought, onDelete }) => {
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
      className={`${styles.itemCard} ${item.is_bought ? styles.itemCardBought : styles.itemCardUnbought}`}
    >
      <div className={styles.itemContent}>
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
              <span className={`${styles.itemName} ${item.is_bought ? styles.itemNameBought : styles.itemNameUnbought}`}>
                {item.name}
              </span>
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
        <button
          onClick={() => onDelete(item.id)}
          className={styles.deleteItemButton}
          title="Admin only: Delete this item"
        >
          <Trash2 className={styles.deleteItemButtonIcon} />
        </button>
      </div>
    </div>
  )
}

interface DroppableFolderProps {
  folder: ListFolder
  children: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
}

const DroppableFolder: React.FC<DroppableFolderProps> = ({ folder, children, isExpanded, onToggle, onDelete }) => {
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
            onDelete()
          }}
          className={styles.deleteButton}
          title="Delete folder"
        >
          <Trash2 className={styles.deleteButtonIcon} />
        </button>
      </div>
      {isExpanded && children}
    </div>
  )
}

interface DraggableListProps {
  list: WishList
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}

const DraggableList: React.FC<DraggableListProps> = ({ list, isSelected, onClick, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: 'list',
      list,
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
      <div className={styles.listItemContent}>
        <div className={styles.listItemNameContainer}>
          {list.is_christmas && (
            <span className={styles.christmasIcon} title="Christmas List">
              <CandyCane size={16} />
            </span>
          )}
          <span className={styles.listItemName}>{list.name}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className={styles.deleteButton}
          title="Delete this wish list"
        >
          <Trash2 className={styles.deleteButtonIcon} />
        </button>
      </div>
    </div>
  )
}

interface DroppableAvailableListsProps {
  children: React.ReactNode
}

const DroppableAvailableLists: React.FC<DroppableAvailableListsProps> = ({ children }) => {
  const { setNodeRef, isOver } = useSortable({
    id: 'available-lists',
    data: {
      type: 'available-lists-area',
    }
  })

  return (
    <div ref={setNodeRef} className={`${styles.availableListsArea} ${isOver ? styles.availableListsAreaOver : ''}`}>
      {children}
    </div>
  )
}

const AdminPage: React.FC = () => {
  const [wishLists, setWishLists] = useState<WishList[]>([])
  const [folders, setFolders] = useState<ListFolder[]>([])
  const [selectedList, setSelectedList] = useState<WishList | null>(null)
  const [wishItems, setWishItems] = useState<WishItem[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

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
    }
  }

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('list_folders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFolders(data || [])
    } catch (error) {
      console.error('Error fetching folders:', error)
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

  const deleteWishList = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this wish list? This will also delete all items in it.')) return

    try {
      const { error } = await supabase
        .from('wish_lists')
        .delete()
        .eq('id', id)

      if (error) throw error
      setWishLists(wishLists.filter(list => list.id !== id))
      if (selectedList?.id === id) {
        setSelectedList(null)
        setWishItems([])
      }
    } catch (error) {
      console.error('Error deleting wish list:', error)
    }
  }

  const deleteFolder = async (id: string) => {
    const listsInFolder = wishLists.filter(list => list.folder_id === id)
    const confirmMessage = listsInFolder.length > 0
      ? `This folder contains ${listsInFolder.length} list(s). Deleting the folder will move them to Available Lists. Continue?`
      : 'Are you sure you want to delete this folder?'
    
    if (!window.confirm(confirmMessage)) return

    try {
      const { error } = await supabase
        .from('list_folders')
        .delete()
        .eq('id', id)

      if (error) throw error
      setFolders(folders.filter(folder => folder.id !== id))
      // Lists will automatically have folder_id set to null due to ON DELETE SET NULL
      fetchWishLists()
    } catch (error) {
      console.error('Error deleting folder:', error)
    }
  }

  const toggleFolderExpanded = (folderId: string) => {
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

  const deleteWishItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('wish_items')
        .delete()
        .eq('id', id)

      if (error) throw error
      setWishItems(wishItems.filter(item => item.id !== id))
    } catch (error) {
      console.error('Error deleting wish item:', error)
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
        // Optimistic update
        setWishLists(prev => prev.map(l =>
          l.id === listId ? { ...l, folder_id: folderId } : l
        ))
        setExpandedFolders(prev => new Set(prev).add(folderId))

        try {
          const { error } = await supabase
            .from('wish_lists')
            .update({ folder_id: folderId })
            .eq('id', listId)
          if (error) throw error
        } catch (error) {
          console.error('Error moving list to folder:', error)
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
        // Optimistic update
        setWishLists(prev => prev.map(l =>
          l.id === listId ? { ...l, folder_id: null } : l
        ))

        try {
          const { error } = await supabase
            .from('wish_lists')
            .update({ folder_id: null })
            .eq('id', listId)
          if (error) throw error
        } catch (error) {
          console.error('Error removing list from folder:', error)
          fetchWishLists()
        }
      }
      return
    }

    // Handle item reordering (existing logic)
    if (over && active.id !== over.id && active.data.current?.type !== 'list') {
      const oldIndex = wishItems.findIndex(item => item.id === active.id)
      const newIndex = wishItems.findIndex(item => item.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(wishItems, oldIndex, newIndex)
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
  }

  const availableLists = wishLists.filter(list => !list.folder_id)
  const allDraggableIds = [
    ...folders.map(f => f.id),
    ...wishLists.map(l => l.id),
    'available-lists'
  ]

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Admin Panel</h1>
          <p className={styles.subtitle}>Delete wish lists, folders, and items • Drag lists into/out of folders • Drag items to reorder by priority</p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={allDraggableIds}
            strategy={verticalListSortingStrategy}
          >
            <div className={styles.grid}>
              {/* Wish Lists Section */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Wish Lists & Folders</h2>
                </div>

                <div className={styles.listContainer}>
                  {/* Folders */}
                  {folders.map((folder) => {
                    const folderLists = wishLists.filter(list => list.folder_id === folder.id)
                    const isExpanded = expandedFolders.has(folder.id)
                    
                    return (
                      <DroppableFolder
                        key={folder.id}
                        folder={folder}
                        isExpanded={isExpanded}
                        onToggle={() => toggleFolderExpanded(folder.id)}
                        onDelete={() => deleteFolder(folder.id)}
                      >
                        <div className={styles.folderLists}>
                          {folderLists.map((list) => (
                            <DraggableList
                              key={list.id}
                              list={list}
                              isSelected={selectedList?.id === list.id}
                              onClick={() => setSelectedList(list)}
                              onDelete={() => deleteWishList(list.id)}
                            />
                          ))}
                          {folderLists.length === 0 && (
                            <p className={styles.emptyFolder}>No lists in this folder</p>
                          )}
                        </div>
                      </DroppableFolder>
                    )
                  })}

                  {/* Available Lists (not in folders) */}
                  {availableLists.length > 0 && (
                    <DroppableAvailableLists>
                      <div className={styles.availableListsHeader}>
                        <h3 className={styles.availableListsTitle}>Available Lists</h3>
                      </div>
                      {availableLists.map((list) => (
                        <DraggableList
                          key={list.id}
                          list={list}
                          isSelected={selectedList?.id === list.id}
                          onClick={() => setSelectedList(list)}
                          onDelete={() => deleteWishList(list.id)}
                        />
                      ))}
                    </DroppableAvailableLists>
                  )}

                  {wishLists.length === 0 && (
                    <p className={styles.emptyState}>No wish lists yet</p>
                  )}
                </div>
              </div>

              {/* Wish Items Section */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    Items {selectedList && `- ${selectedList.name}`}
                  </h2>
                </div>

                {!selectedList && (
                  <p className={styles.emptyState}>Select a wish list to view items</p>
                )}

                {selectedList && (
                  <SortableContext
                    items={wishItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className={styles.itemContainer}>
                      {wishItems.map((item) => (
                        <AdminSortableItem
                          key={item.id}
                          item={item}
                          onToggleBought={toggleItemBought}
                          onDelete={deleteWishItem}
                        />
                      ))}
                      {wishItems.length === 0 && (
                        <p className={styles.emptyState}>No items in this list yet</p>
                      )}
                    </div>
                  </SortableContext>
                )}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

export default AdminPage
