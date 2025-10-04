import React, { useState, useEffect } from 'react'
import { supabase, WishList, WishItem } from '../lib/supabase'
import { Trash2, ExternalLink, Check, ShoppingCart, GripVertical } from 'lucide-react'
import styles from '../styles/AdminPage.module.css'
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

const AdminPage: React.FC = () => {
  const [wishLists, setWishLists] = useState<WishList[]>([])
  const [selectedList, setSelectedList] = useState<WishList | null>(null)
  const [wishItems, setWishItems] = useState<WishItem[]>([])

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

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Admin Panel</h1>
          <p className={styles.subtitle}>Delete wish lists and items • Drag to reorder by priority (Add functionality available on the main page)</p>
        </div>

        <div className={styles.grid}>
          {/* Wish Lists Section */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Wish Lists</h2>
            </div>

            <div className={styles.listContainer}>
              {wishLists.map((list) => (
                <div
                  key={list.id}
                  className={`${styles.listItem} ${selectedList?.id === list.id ? styles.listItemSelected : ''}`}
                  onClick={() => setSelectedList(list)}
                >
                  <div className={styles.listItemContent}>
                    <span className={styles.listItemName}>{list.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteWishList(list.id)
                      }}
                      className={styles.deleteButton}
                      title="Admin only: Delete this wish list"
                    >
                      <Trash2 className={styles.deleteButtonIcon} />
                    </button>
                  </div>
                </div>
              ))}
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
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
