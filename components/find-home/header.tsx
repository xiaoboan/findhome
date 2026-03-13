'use client'

import { useState, useEffect } from 'react'
import { Home, Search, Filter, Edit3, GitCompareArrows, X, User, Sun, Moon, Flower2, LogOut, Check, MapPin, Building2, Key, Download } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ViewMode, PropertyMode } from '@/types/property'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePwaInstall } from '@/components/find-home/pwa-install-prompt'

interface HeaderProps {
  viewMode: ViewMode
  propertyMode: PropertyMode
  searchQuery: string
  onSearchChange: (query: string) => void
  onToggleEdit: () => void
  onToggleCompare: () => void
  onToggleMap: () => void
  onPropertyModeChange: (mode: PropertyMode) => void
  canCompare: boolean
  isCompareSelecting: boolean
  filterTag: string | null
  onClearFilter: () => void
}

const modeLabels: Record<ViewMode, string> = {
  list: '房源决策',
  detail: '详情查看',
  compare: '对比模式',
  edit: '编辑模式',
  map: '地图模式',
}

// 主题配置
type ThemeType = 'light' | 'minimal' | 'dark'

const themeConfig: Record<ThemeType, { icon: typeof Sun; label: string; description: string }> = {
  light: { icon: Flower2, label: '温馨粉', description: '温暖舒适的粉色系' },
  minimal: { icon: Sun, label: '极简', description: '简洁黑白风格' },
  dark: { icon: Moon, label: '暗夜', description: '护眼深色模式' },
}

export function Header({
  viewMode,
  propertyMode,
  searchQuery,
  onSearchChange,
  onToggleEdit,
  onToggleCompare,
  onToggleMap,
  onPropertyModeChange,
  canCompare,
  isCompareSelecting,
  filterTag,
  onClearFilter,
}: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const isMobile = useIsMobile()
  const { canInstall, isInstalled, install } = usePwaInstall()

  useEffect(() => {
    setMounted(true)
  }, [])

  // 避免 hydration mismatch
  const currentTheme = (mounted ? theme : 'light') as ThemeType

  return (
    <header className="flex h-14 md:h-16 items-center justify-between border-b border-border bg-card px-3 md:px-6 shadow-sm gap-2">
      {/* Logo */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl bg-primary shadow-md">
          <Home className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg md:text-xl font-bold text-primary">
            寻家
          </span>
          <span className="hidden sm:block text-[10px] text-muted-foreground -mt-0.5">找到温馨的家</span>
        </div>
        <Badge
          variant="secondary"
          className="hidden md:inline-flex bg-accent text-accent-foreground"
        >
          {modeLabels[viewMode]}
        </Badge>
        {/* 买房/租房切换 */}
        <div className="flex items-center rounded-full border border-border bg-muted p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPropertyModeChange('buy')}
            className={`h-7 rounded-full px-2.5 text-xs gap-1 ${
              propertyMode === 'buy'
                ? 'bg-card text-primary shadow-sm font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-3 w-3" />
            <span className="hidden sm:inline">买房</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPropertyModeChange('rent')}
            className={`h-7 rounded-full px-2.5 text-xs gap-1 ${
              propertyMode === 'rent'
                ? 'bg-card text-primary shadow-sm font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Key className="h-3 w-3" />
            <span className="hidden sm:inline">租房</span>
          </Button>
        </div>
      </div>

      {/* 搜索栏 - 桌面端常驻，手机端点击展开 */}
      {isMobile && showSearch ? (
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索小区名称、房号、区域..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 w-full rounded-full border-border bg-background pl-9 pr-4 focus:border-primary"
              autoFocus
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => { setShowSearch(false); onSearchChange('') }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          {/* 搜索栏 - 桌面端 */}
          <div className="hidden md:flex flex-1 items-center justify-center px-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="搜索小区名称、房号、区域..."
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
          <div className="flex items-center gap-1 md:gap-2">
            {/* 手机端搜索按钮 */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={() => setShowSearch(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
            )}

            {/* 手机端筛选标签 */}
            {isMobile && filterTag && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5"
              >
                {filterTag}
                <button onClick={onClearFilter}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            <Button
              variant={viewMode === 'edit' ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleEdit}
              className={`gap-1.5 h-8 md:h-9 px-2 md:px-3 transition-all ${
                viewMode === 'edit'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
                  : 'border-border text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary'
              }`}
            >
              {viewMode === 'edit' ? <Check className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              <span className="hidden sm:inline text-xs md:text-sm">{viewMode === 'edit' ? '完成编辑' : '编辑'}</span>
            </Button>
            <Button
              variant={viewMode === 'compare' || isCompareSelecting ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleCompare}
              className={`gap-1.5 h-8 md:h-9 px-2 md:px-3 transition-all ${
                viewMode === 'compare' || isCompareSelecting
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
                  : 'border-border text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary'
              }`}
            >
              <GitCompareArrows className="h-4 w-4" />
              <span className="hidden sm:inline text-xs md:text-sm">
                {viewMode === 'compare' ? '退出对比' : isCompareSelecting ? '取消选择' : '对比'}
              </span>
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleMap}
              className={`gap-1.5 h-8 md:h-9 px-2 md:px-3 transition-all ${
                viewMode === 'map'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
                  : 'border-border text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary'
              }`}
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline text-xs md:text-sm">
                {viewMode === 'map' ? '退出地图' : '地图'}
              </span>
            </Button>

            {/* 三档主题切换按钮 - 手机端隐藏 */}
            <TooltipProvider>
              <div className="hidden md:flex items-center rounded-full border border-border bg-muted p-1">
                {(Object.keys(themeConfig) as ThemeType[]).map((themeKey) => {
                  const config = themeConfig[themeKey]
                  const Icon = config.icon
                  const isActive = currentTheme === themeKey

                  return (
                    <Tooltip key={themeKey}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setTheme(themeKey)}
                          className={`h-8 w-8 rounded-full transition-all ${
                            isActive
                              ? 'bg-card text-primary shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${themeKey === 'light' && isActive ? 'fill-current' : ''}`} />
                          <span className="sr-only">{config.label}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="font-medium">{config.label}</p>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </TooltipProvider>

            <Popover>
              <PopoverTrigger asChild>
                <Avatar className="h-8 w-8 md:h-10 md:w-10 cursor-pointer border-2 border-border hover:border-primary transition-colors shadow-sm">
                  <AvatarImage src="/placeholder-user.jpg" alt="用户头像" />
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium text-foreground truncate">
                      {user?.user_metadata?.username || user?.email || '用户'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  {/* 手机端主题切换 */}
                  {isMobile && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">主题</span>
                      <div className="flex items-center rounded-full border border-border bg-muted p-0.5">
                        {(Object.keys(themeConfig) as ThemeType[]).map((themeKey) => {
                          const config = themeConfig[themeKey]
                          const Icon = config.icon
                          const isActive = currentTheme === themeKey
                          return (
                            <Button
                              key={themeKey}
                              variant="ghost"
                              size="icon"
                              onClick={() => setTheme(themeKey)}
                              className={`h-7 w-7 rounded-full ${
                                isActive ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                              }`}
                            >
                              <Icon className={`h-3.5 w-3.5 ${themeKey === 'light' && isActive ? 'fill-current' : ''}`} />
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {canInstall && !isInstalled && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-primary hover:text-primary hover:border-primary"
                      onClick={install}
                    >
                      <Download className="h-4 w-4" />
                      安装到桌面
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-muted-foreground hover:text-destructive hover:border-destructive"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}
    </header>
  )
}
