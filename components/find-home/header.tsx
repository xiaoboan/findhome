'use client'

import { Home, Search, Filter, Edit3, GitCompareArrows, X, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ViewMode } from '@/types/property'

interface HeaderProps {
  viewMode: ViewMode
  searchQuery: string
  onSearchChange: (query: string) => void
  onToggleEdit: () => void
  onToggleCompare: () => void
  canCompare: boolean
  filterTag: string | null
  onClearFilter: () => void
}

const modeLabels: Record<ViewMode, string> = {
  list: '房源决策',
  detail: '详情查看',
  compare: '对比模式',
  edit: '编辑模式',
}

export function Header({
  viewMode,
  searchQuery,
  onSearchChange,
  onToggleEdit,
  onToggleCompare,
  canCompare,
  filterTag,
  onClearFilter,
}: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Home className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-primary">寻家</span>
        <Badge 
          variant="secondary" 
          className="ml-2 bg-secondary text-secondary-foreground"
        >
          {modeLabels[viewMode]}
        </Badge>
      </div>

      {/* 搜索栏 */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索小区名称、区域..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 w-full rounded-full border-border bg-muted pl-10 pr-10 focus:ring-primary"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
          >
            <Filter className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        {filterTag && (
          <Badge 
            variant="secondary" 
            className="ml-2 flex items-center gap-1 bg-secondary text-secondary-foreground"
          >
            筛选: {filterTag}
            <button onClick={onClearFilter} className="ml-1 hover:text-primary">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>

      {/* 操作区 */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'edit' ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleEdit}
          className={`gap-2 ${
            viewMode === 'edit'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border-primary text-primary hover:bg-secondary'
          }`}
        >
          <Edit3 className="h-4 w-4" />
          <span className="hidden sm:inline">编辑模式</span>
        </Button>
        <Button
          variant={viewMode === 'compare' ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleCompare}
          disabled={!canCompare && viewMode !== 'compare'}
          className={`gap-2 ${
            viewMode === 'compare'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border-border text-foreground hover:bg-muted'
          }`}
        >
          <GitCompareArrows className="h-4 w-4" />
          <span className="hidden sm:inline">对比模式</span>
        </Button>
        <Avatar className="h-9 w-9 cursor-pointer border border-border">
          <AvatarImage src="/placeholder-user.jpg" alt="用户头像" />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
