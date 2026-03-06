'use client'

import { Home, Search, Filter, Edit3, GitCompareArrows, X, User, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
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
  const { theme, setTheme } = useTheme()

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md">
          <Home className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            寻家
          </span>
          <span className="text-[10px] text-muted-foreground -mt-0.5">找到温馨的家</span>
        </div>
        <Badge 
          variant="secondary" 
          className="ml-2 bg-accent text-accent-foreground"
        >
          {modeLabels[viewMode]}
        </Badge>
      </div>

      {/* 搜索栏 */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索小区名称、区域..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 w-full rounded-full border-border bg-background pl-11 pr-11 focus:border-primary focus:ring-primary/20 shadow-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full hover:bg-accent"
          >
            <Filter className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        {filterTag && (
          <Badge 
            variant="secondary" 
            className="ml-3 flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1"
          >
            筛选: {filterTag}
            <button onClick={onClearFilter} className="ml-1 hover:text-primary/70 transition-colors">
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
          className={`gap-2 transition-all ${
            viewMode === 'edit'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
              : 'border-border text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary'
          }`}
        >
          <Edit3 className="h-4 w-4" />
          <span className="hidden sm:inline">编辑</span>
        </Button>
        <Button
          variant={viewMode === 'compare' ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleCompare}
          disabled={!canCompare && viewMode !== 'compare'}
          className={`gap-2 transition-all ${
            viewMode === 'compare'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
              : 'border-border text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary disabled:opacity-50'
          }`}
        >
          <GitCompareArrows className="h-4 w-4" />
          <span className="hidden sm:inline">对比</span>
        </Button>
        
        {/* 主题切换 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-9 w-9 rounded-full hover:bg-accent"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">切换主题</span>
        </Button>

        <Avatar className="h-10 w-10 cursor-pointer border-2 border-border hover:border-primary transition-colors shadow-sm">
          <AvatarImage src="/placeholder-user.jpg" alt="用户头像" />
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
