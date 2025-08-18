/**
 * 滚动条显示/隐藏管理器
 * 实现滚动时显示，停止后隐藏的效果
 */

class ScrollbarManager {
  private scrollTimers = new Map<Element | Window, NodeJS.Timeout>();
  private windowScrollTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * 初始化滚动条管理器
   */
  init() {
    if (this.isInitialized) return;
    
    // 监听窗口级别的滚动事件
    window.addEventListener('scroll', this.handleWindowScroll, { passive: true });
    
    // 监听所有元素的滚动事件
    document.addEventListener('scroll', this.handleElementScroll, { passive: true, capture: true });
    
    // 监听鼠标滚轮事件
    document.addEventListener('wheel', this.handleWheel, { passive: true });
    
    // 监听触摸滚动事件
    document.addEventListener('touchmove', this.handleTouch, { passive: true });
    
    this.isInitialized = true;
    console.log('滚动条管理器已初始化');
  }

  /**
   * 处理窗口级别滚动事件
   */
  private handleWindowScroll = () => {
    this.showWindowScrollbar();
  };

  /**
   * 处理元素滚动事件
   */
  private handleElementScroll = (event: Event) => {
    const target = event.target as Element;
    if (target && target !== document.documentElement && target !== document.body && target.scrollHeight > target.clientHeight) {
      this.showScrollbar(target);
    }
  };

  /**
   * 处理鼠标滚轮事件
   */
  private handleWheel = (event: WheelEvent) => {
    // 检查是否是窗口级别的滚动
    if (document.documentElement.scrollHeight > window.innerHeight || document.body.scrollHeight > window.innerHeight) {
      this.showWindowScrollbar();
    }
    
    const target = this.findScrollableParent(event.target as Element);
    if (target && target !== document.documentElement && target !== document.body) {
      this.showScrollbar(target);
    }
  };

  /**
   * 处理触摸移动事件
   */
  private handleTouch = (event: TouchEvent) => {
    // 检查是否是窗口级别的滚动
    if (document.documentElement.scrollHeight > window.innerHeight || document.body.scrollHeight > window.innerHeight) {
      this.showWindowScrollbar();
    }
    
    const target = this.findScrollableParent(event.target as Element);
    if (target && target !== document.documentElement && target !== document.body) {
      this.showScrollbar(target);
    }
  };

  /**
   * 找到可滚动的父元素
   */
  private findScrollableParent(element: Element | null): Element | null {
    if (!element) return null;
    
    // 检查当前元素是否可滚动
    if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
      return element;
    }
    
    // 递归检查父元素
    return this.findScrollableParent(element.parentElement);
  }

  /**
   * 显示窗口滚动条
   */
  private showWindowScrollbar() {
    // 为 html 和 body 添加窗口滚动类
    document.documentElement.classList.add('window-scrolling');
    document.body.classList.add('window-scrolling');
    
    // 清除之前的定时器
    if (this.windowScrollTimer) {
      clearTimeout(this.windowScrollTimer);
    }
    
    // 设置新的定时器，1.5秒后隐藏滚动条
    this.windowScrollTimer = setTimeout(() => {
      document.documentElement.classList.remove('window-scrolling');
      document.body.classList.remove('window-scrolling');
      this.windowScrollTimer = null;
    }, 1500);
  }

  /**
   * 显示元素滚动条
   */
  private showScrollbar(element: Element) {
    // 添加滚动中的类
    element.classList.add('scrolling');
    
    // 清除之前的定时器
    const existingTimer = this.scrollTimers.get(element);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // 设置新的定时器，1秒后隐藏滚动条
    const timer = setTimeout(() => {
      element.classList.remove('scrolling');
      this.scrollTimers.delete(element);
    }, 1000);
    
    this.scrollTimers.set(element, timer);
  }

  /**
   * 销毁管理器
   */
  destroy() {
    if (!this.isInitialized) return;
    
    window.removeEventListener('scroll', this.handleWindowScroll);
    document.removeEventListener('scroll', this.handleElementScroll, true);
    document.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('touchmove', this.handleTouch);
    
    // 清除窗口滚动定时器
    if (this.windowScrollTimer) {
      clearTimeout(this.windowScrollTimer);
      this.windowScrollTimer = null;
    }
    
    // 清除所有元素滚动定时器
    this.scrollTimers.forEach(timer => clearTimeout(timer));
    this.scrollTimers.clear();
    
    // 移除所有滚动类
    document.documentElement.classList.remove('window-scrolling');
    document.body.classList.remove('window-scrolling');
    document.querySelectorAll('.scrolling').forEach(el => {
      el.classList.remove('scrolling');
    });
    
    this.isInitialized = false;
    console.log('滚动条管理器已销毁');
  }
}

// 导出单例实例
export const scrollbarManager = new ScrollbarManager();
