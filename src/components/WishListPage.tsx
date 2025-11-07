import React, { useState, useEffect } from 'react'
import { supabase, WishList, WishItem } from '../lib/supabase'
import { ExternalLink, Check, ShoppingCart, Gift, Plus, GripVertical, Edit2, ChevronUp, ChevronDown, Star } from 'lucide-react'
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
  onEditNameChange: (value: string) => void
  onEditLinkChange: (value: string) => void
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
  onEditNameChange,
  onEditLinkChange,
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

const WishListPage: React.FC = () => {
  const [wishLists, setWishLists] = useState<WishList[]>([])
  const [selectedList, setSelectedList] = useState<WishList | null>(null)
  const [wishItems, setWishItems] = useState<WishItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddList, setShowAddList] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemLink, setNewItemLink] = useState('')
  const [hasShownDragTip, setHasShownDragTip] = useState(false)
  const [editingItem, setEditingItem] = useState<WishItem | null>(null)
  const [editingList, setEditingList] = useState<WishList | null>(null)
  const [editItemName, setEditItemName] = useState('')
  const [editItemLink, setEditItemLink] = useState('')
  const [editListName, setEditListName] = useState('')
  const [movingItemId, setMovingItemId] = useState<string | null>(null)
  const [excludeBoughtLists, setExcludeBoughtLists] = useState<Set<string>>(new Set())

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

  const filteredWishItems = selectedList && excludeBoughtLists.has(selectedList.id)
    ? wishItems.filter(item => !item.is_bought)
    : wishItems

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchWishLists()
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
        .insert([{ name: newListName.trim() }])
        .select()

      if (error) throw error
      setWishLists([data[0], ...wishLists])
      setNewListName('')
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
          priority: wishItems.length
        }])
        .select()

      if (error) throw error
      setWishItems([data[0], ...wishItems])
      setNewItemName('')
      setNewItemLink('')
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

  const startEditItem = (item: WishItem) => {
    setEditingItem(item)
    setEditItemName(item.name)
    setEditItemLink(item.link || '')
  }

  const startEditList = (list: WishList) => {
    setEditingList(list)
    setEditListName(list.name)
  }

  const saveEditItem = async () => {
    if (!editingItem || !editItemName.trim()) return

    try {
      const { error } = await supabase
        .from('wish_items')
        .update({
          name: editItemName.trim(),
          link: editItemLink.trim() || null
        })
        .eq('id', editingItem.id)

      if (error) throw error

      // Update local state
      setWishItems(wishItems.map(item => 
        item.id === editingItem.id 
          ? { ...item, name: editItemName.trim(), link: editItemLink.trim() || null }
          : item
      ))

      setEditingItem(null)
      setEditItemName('')
      setEditItemLink('')
    } catch (error) {
      console.error('Error updating wish item:', error)
    }
  }

  const saveEditList = async () => {
    if (!editingList || !editListName.trim()) return

    try {
      const { error } = await supabase
        .from('wish_lists')
        .update({ name: editListName.trim() })
        .eq('id', editingList.id)

      if (error) throw error

      // Update local state
      setWishLists(wishLists.map(list => 
        list.id === editingList.id 
          ? { ...list, name: editListName.trim() }
          : list
      ))

      // Update selected list if it's the one being edited
      if (selectedList?.id === editingList.id) {
        setSelectedList({ ...selectedList, name: editListName.trim() })
      }

      setEditingList(null)
      setEditListName('')
    } catch (error) {
      console.error('Error updating wish list:', error)
    }
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setEditingList(null)
    setEditItemName('')
    setEditItemLink('')
    setEditListName('')
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

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
              <button
                onClick={() => setShowAddList(true)}
                className={styles.addButton}
              >
                <Plus className={styles.addButtonIcon} />
                Add List
              </button>
            </div>

            {showAddList && (
              <div className={styles.addForm}>
                <input
                  type="text"
                  placeholder="List name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className={styles.input}
                />
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
                    }}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className={styles.listContainer}>
              {wishLists.map((list) => (
                <div
                  key={list.id}
                  className={`${styles.listItem} ${selectedList?.id === list.id ? styles.listItemSelected : ''}`}
                >
                  {editingList?.id === list.id ? (
                    <div className={styles.editForm}>
                      <input
                        type="text"
                        placeholder="List name"
                        value={editListName}
                        onChange={(e) => setEditListName(e.target.value)}
                        className={styles.input}
                      />
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
                  ) : (
                    <div className={styles.listItemContent} onClick={() => setSelectedList(list)}>
                      <div className={styles.listItemHeader}>
                        <span className={styles.listItemName}>{list.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEditList(list)
                          }}
                          className={styles.editListButton}
                          title="Edit list name"
                        >
                          <Edit2 className={styles.editButtonIcon} />
                        </button>
                      </div>
                      <p className={styles.listItemDate}>
                        Created {new Date(list.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {wishLists.length === 0 && (
                <div className={styles.emptyState}>
                  <Gift className={styles.emptyStateIcon} />
                  <p>No wish lists available yet</p>
                </div>
              )}
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
                        onEditNameChange={setEditItemName}
                        onEditLinkChange={setEditItemLink}
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
