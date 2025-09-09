/**
 * Modern Mobile Viewport Manager
 * 
 * Features:
 * - Capability detection instead of user-agent sniffing
 * - Visual Viewport API for precise keyboard height measurement
 * - CSS Custom Properties for dynamic container height
 * - Dynamic viewport units (100dvh) support
 * - iOS Safari specific fixes
 * - Touch optimization and focus management
 */

interface ViewportState {
  height: number;
  keyboardHeight: number;
  isKeyboardOpen: boolean;
  visualViewportSupported: boolean;
  dynamicViewportSupported: boolean;
}

interface ViewportCallbacks {
  onKeyboardShow?: (height: number) => void;
  onKeyboardHide?: () => void;
  onViewportChange?: (state: ViewportState) => void;
}

class MobileViewportManager {
  private callbacks: ViewportCallbacks = {};
  private currentState: ViewportState = {
    height: window.innerHeight,
    keyboardHeight: 0,
    isKeyboardOpen: false,
    visualViewportSupported: false,
    dynamicViewportSupported: false
  };
  private initialViewportHeight: number = window.innerHeight;
  private isIOS: boolean = false;
  private isMobile: boolean = false;
  private resizeObserver?: ResizeObserver;
  private debounceTimer?: number;

  constructor() {
    this.detectCapabilities();
    this.setupViewportTracking();
    this.setupCSSCustomProperties();
  }

  /**
   * Modern capability detection instead of user-agent sniffing
   */
  private detectCapabilities(): void {
    // Detect mobile capabilities
    this.isMobile = this.hasMobileCapabilities();
    
    // Detect iOS by checking for specific behaviors rather than user agent
    this.isIOS = this.detectIOS();
    
    // Check Visual Viewport API support
    this.currentState.visualViewportSupported = 'visualViewport' in window;
    
    // Check dynamic viewport units support
    this.currentState.dynamicViewportSupported = this.supportsDynamicViewport();
    
    console.log('[MobileViewport] Capabilities:', {
      isMobile: this.isMobile,
      isIOS: this.isIOS,
      visualViewportSupported: this.currentState.visualViewportSupported,
      dynamicViewportSupported: this.currentState.dynamicViewportSupported
    });
  }

  /**
   * Capability-based mobile detection
   */
  private hasMobileCapabilities(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 768 ||
      (window.screen && window.screen.width <= 768)
    );
  }

  /**
   * iOS detection using feature detection
   */
  private detectIOS(): boolean {
    return (
      /iPad|iPhone|iPod/.test(navigator.platform) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      ('standalone' in (window as unknown as { navigator: { standalone?: boolean } }).navigator)
    );
  }

  /**
   * Check if browser supports dynamic viewport units (dvh, dvw)
   */
  private supportsDynamicViewport(): boolean {
    if (!window.CSS?.supports) return false;
    return window.CSS.supports('height', '100dvh');
  }

  /**
   * Setup CSS custom properties for dynamic height management
   */
  private setupCSSCustomProperties(): void {
    const root = document.documentElement;
    
    // Set initial viewport height
    root.style.setProperty('--viewport-height', `${window.innerHeight}px`);
    root.style.setProperty('--keyboard-height', '0px');
    root.style.setProperty('--available-height', `${window.innerHeight}px`);
    
    // Add utility classes
    const style = document.createElement('style');
    style.textContent = `
      .viewport-height {
        height: var(--viewport-height) !important;
      }
      
      .available-height {
        height: var(--available-height) !important;
      }
      
      .keyboard-adjusted {
        height: calc(var(--viewport-height) - var(--keyboard-height)) !important;
        transition: height 0.3s ease-out !important;
      }
      
      /* Modern dynamic viewport units */
      .dynamic-viewport-height {
        height: ${this.currentState.dynamicViewportSupported ? '100dvh' : 'var(--viewport-height)'} !important;
      }
      
      /* iOS Safari specific fixes */
      .ios-viewport-fix {
        height: -webkit-fill-available !important;
      }
      
      /* Touch optimizations */
      .touch-optimized {
        -webkit-tap-highlight-color: transparent !important;
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        touch-action: manipulation !important;
      }
      
      /* Prevent zoom on input focus */
      .no-zoom-input {
        font-size: 16px !important;
        transform: scale(1) !important;
      }
      
      /* Smooth keyboard transitions */
      .keyboard-transition {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup viewport tracking using Visual Viewport API or fallback
   */
  private setupViewportTracking(): void {
    if (this.currentState.visualViewportSupported) {
      this.setupVisualViewportTracking();
    } else {
      this.setupFallbackTracking();
    }
  }

  /**
   * Use Visual Viewport API for precise keyboard height measurement
   */
  private setupVisualViewportTracking(): void {
    if (!window.visualViewport) return;

    const handleViewportChange = () => {
      this.debounceViewportUpdate(() => {
        const vv = window.visualViewport!;
        const keyboardHeight = this.initialViewportHeight - vv.height;
        const isKeyboardOpen = keyboardHeight > 50; // 50px threshold
        
        this.updateViewportState({
          height: vv.height,
          keyboardHeight: Math.max(0, keyboardHeight),
          isKeyboardOpen
        });
      });
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    // iOS Safari fix: Handle orientation changes
    if (this.isIOS) {
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          this.initialViewportHeight = window.innerHeight;
          handleViewportChange();
        }, 500);
      });
    }
  }

  /**
   * Fallback tracking for browsers without Visual Viewport API
   */
  private setupFallbackTracking(): void {
    const handleResize = () => {
      this.debounceViewportUpdate(() => {
        const currentHeight = window.innerHeight;
        const heightDifference = this.initialViewportHeight - currentHeight;
        const isKeyboardOpen = heightDifference > 150; // More conservative threshold
        
        this.updateViewportState({
          height: currentHeight,
          keyboardHeight: Math.max(0, heightDifference),
          isKeyboardOpen
        });
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Listen for focus/blur events on inputs
    document.addEventListener('focusin', (e) => {
      if (this.isInputElement(e.target)) {
        setTimeout(handleResize, 300);
      }
    });

    document.addEventListener('focusout', (e) => {
      if (this.isInputElement(e.target)) {
        setTimeout(handleResize, 300);
      }
    });
  }

  /**
   * Debounce viewport updates to prevent excessive calculations
   */
  private debounceViewportUpdate(callback: () => void): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = window.setTimeout(() => {
      requestAnimationFrame(callback);
    }, 16); // ~60fps
  }

  /**
   * Update viewport state and trigger callbacks
   */
  private updateViewportState(updates: Partial<ViewportState>): void {
    const prevState = { ...this.currentState };
    this.currentState = { ...this.currentState, ...updates };
    
    // Update CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--viewport-height', `${this.currentState.height}px`);
    root.style.setProperty('--keyboard-height', `${this.currentState.keyboardHeight}px`);
    root.style.setProperty('--available-height', 
      `${this.currentState.height - this.currentState.keyboardHeight}px`);

    // Trigger callbacks
    if (this.currentState.isKeyboardOpen !== prevState.isKeyboardOpen) {
      if (this.currentState.isKeyboardOpen && this.callbacks.onKeyboardShow) {
        this.callbacks.onKeyboardShow(this.currentState.keyboardHeight);
      } else if (!this.currentState.isKeyboardOpen && this.callbacks.onKeyboardHide) {
        this.callbacks.onKeyboardHide();
      }
    }

    if (this.callbacks.onViewportChange) {
      this.callbacks.onViewportChange(this.currentState);
    }
  }

  /**
   * Check if element is an input that can trigger virtual keyboard
   */
  private isInputElement(element: EventTarget | null): boolean {
    if (!element || !(element instanceof Element)) return false;
    
    const tagName = element.tagName.toLowerCase();
    const htmlElement = element as HTMLElement;
    
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      htmlElement.contentEditable === 'true' ||
      element.hasAttribute('contenteditable')
    );
  }

  /**
   * Register callbacks for viewport events
   */
  public setCallbacks(callbacks: ViewportCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Get current viewport state
   */
  public getState(): ViewportState {
    return { ...this.currentState };
  }

  /**
   * Apply mobile optimizations to an element
   */
  public optimizeElement(element: HTMLElement, options: {
    preventZoom?: boolean;
    touchOptimized?: boolean;
    keyboardAdjusted?: boolean;
    useModernViewport?: boolean;
  } = {}): void {
    const {
      preventZoom = true,
      touchOptimized = true,
      keyboardAdjusted = true,
      useModernViewport = true
    } = options;

    if (preventZoom) {
      element.classList.add('no-zoom-input');
    }
    
    if (touchOptimized) {
      element.classList.add('touch-optimized');
    }
    
    if (keyboardAdjusted) {
      element.classList.add('keyboard-adjusted', 'keyboard-transition');
    }
    
    if (useModernViewport && this.currentState.dynamicViewportSupported) {
      element.classList.add('dynamic-viewport-height');
    } else if (this.isIOS) {
      element.classList.add('ios-viewport-fix');
    } else {
      element.classList.add('viewport-height');
    }
  }

  /**
   * Focus management for mobile inputs
   */
  public focusInput(input: HTMLInputElement, options: {
    scrollIntoView?: boolean;
    preventZoom?: boolean;
    delay?: number;
  } = {}): void {
    const { scrollIntoView = true, preventZoom = true, delay = 100 } = options;
    
    if (preventZoom) {
      input.style.fontSize = '16px';
    }
    
    setTimeout(() => {
      input.focus();
      
      if (scrollIntoView && this.isMobile) {
        // Use smooth scrolling with proper timing
        requestAnimationFrame(() => {
          input.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        });
      }
    }, delay);
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  /**
   * Check if device/browser has mobile capabilities
   */
  public get isMobileDevice(): boolean {
    return this.isMobile;
  }

  /**
   * Check if device is iOS
   */
  public get isIOSDevice(): boolean {
    return this.isIOS;
  }
}

// Create and export singleton instance
export const mobileViewport = new MobileViewportManager();

// Export types
export type { ViewportState, ViewportCallbacks };