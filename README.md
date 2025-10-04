# Wish List App

A simple wish list application built with React, TypeScript, and Supabase. Create and manage multiple wish lists with items that can be marked as bought or unbought.

## Features

- **Multiple Wish Lists**: Create and manage multiple wish lists
- **Item Management**: Add items with names and optional links
- **Bought Status**: Mark items as bought or unbought
- **Priority Ordering**: Drag and drop items to reorder by priority
- **Admin Panel**: Password-protected admin interface for deleting lists/items
- **Responsive Design**: Works on desktop and mobile devices

## How It Works

### Public Interface
- View all available wish lists on the home page
- Click on any list to view its items
- Click the checkmark/X icon to toggle bought status
- Click "View Link" to open item URLs in a new tab
- Drag items by the grip handle to reorder by priority

### Admin Interface
- Navigate to `/admin` and enter your admin password
- Delete entire lists or individual items
- Drag and drop items to reorder by priority

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: CSS Modules
- **Backend**: Supabase (PostgreSQL database)
- **Authentication**: Environment variable-based admin password
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Drag & Drop**: @dnd-kit
- **Notifications**: React Hot Toast

## Database Schema

- **wish_lists**: Stores wish list information (id, name, timestamps)
- **wish_items**: Stores individual items (id, wish_list_id, name, link, is_bought, priority, timestamps)

Row Level Security (RLS) is enabled with public read access and admin-only delete access.