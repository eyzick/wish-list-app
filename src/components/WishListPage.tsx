import React, { useState, useEffect } from 'react'
import { supabase, WishList, WishItem } from '../lib/supabase'
import { ExternalLink, Check, ShoppingCart, Gift, Plus, GripVertical } from 'lucide-react'
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
}

const SortableItem: React.FC<SortableItemProps> = ({ item, onToggleBought }) => {
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = wishItems.findIndex(item => item.id === active.id)
      const newIndex = wishItems.findIndex(item => item.id === over.id)
      
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
                  onClick={() => setSelectedList(list)}
                >
                  <div className={styles.listItemContent}>
                    <span className={styles.listItemName}>{list.name}</span>
                    <p className={styles.listItemDate}>
                      Created {new Date(list.created_at).toLocaleDateString()}
                    </p>
                  </div>
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
                <button
                  onClick={() => setShowAddItem(true)}
                  className={styles.addButton}
                >
                  <Plus className={styles.addButtonIcon} />
                  Add Item
                </button>
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={wishItems.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className={styles.itemContainer}>
                    {wishItems.map((item) => (
                      <SortableItem
                        key={item.id}
                        item={item}
                        onToggleBought={toggleItemBought}
                      />
                    ))}
                    {wishItems.length === 0 && (
                      <div className={styles.emptyState}>
                        <GripVertical className={styles.emptyStateIcon} />
                        <p>No items in this list yet</p>
                        <p className={styles.emptyStateText}>Add items and drag to reorder by priority</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Summary */}
        {selectedList && (
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
        )}
      </div>
    </div>
  )
}

export default WishListPage
