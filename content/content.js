class ContextTracker {
  constructor() {
    this.tags = new Map();
    this.containers = new Map();
    this.wrappers = new Map();
    this.processedAreas = new Set();
    this.globalTagCounter = 0; // 添加全局标签计数器
    
    setTimeout(() => {
      this.initialize();
    }, 1000);
  }

  initialize() {
    const scrollableAreas = this.findAllScrollableAreas();
    
    if (scrollableAreas.length === 0) {
      // 如果没有独立滚动区域，设置全页面追踪
      this.setupGlobalTracker();
    } else {
      // 如果有独立滚动区域，为每个区域设置追踪器
      scrollableAreas.forEach(area => this.setupScrollableArea(area));
    }

    this.observeNewScrollableAreas();
  }

  findAllScrollableAreas() {
    const areas = [];
    const processNode = (node) => {
      if (this.isIndependentScrollableArea(node)) {
        areas.push(node);
      }
      Array.from(node.children || []).forEach(child => processNode(child));
    };

    processNode(document.body);
    console.log('Found scrollable areas:', areas.length); // 调试日志
    return areas;
  }

  isIndependentScrollableArea(element) {
    if (!element || !element.nodeType || element.nodeType !== 1) return false;
    if (element === document.body || element === document.documentElement) return false;
    
    const style = window.getComputedStyle(element);
    
    // 检查是否有垂直滚动条
    const hasVerticalScroll = (
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      element.scrollHeight > element.clientHeight
    );
    
    // 检查元素大小
    const hasSignificantSize = element.clientHeight > 100;
    
    // 检查是否是独立容器（父元素不可滚动）
    const hasNonScrollableParent = element.parentElement && 
      !this.isIndependentScrollableArea(element.parentElement);

    return hasVerticalScroll && hasSignificantSize && hasNonScrollableParent;
  }

  setupGlobalTracker() {
    console.log('Setting up global tracker'); // 调试日志
    const globalId = 'global-tracker';
    this.tags.set(globalId, []);

    // 创建全局按钮和容器的包装器
    const wrapper = document.createElement('div');
    wrapper.className = 'llm-tracker-wrapper global';
    wrapper.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 9999;
    `;

    document.body.appendChild(wrapper);
    this.wrappers.set(globalId, wrapper);

    // 创建全局按钮
    this.createButton(wrapper, document.body, true);
    this.createCollapsedContainer(wrapper, document.body, true);

    // 监听全局滚动
    window.addEventListener('scroll', () => this.handleScroll(document.body, true));
  }

  setupScrollableArea(area) {
    if (this.processedAreas.has(area)) return;
    
    console.log('Setting up scroll area tracker'); // 调试日志
    this.processedAreas.add(area);
    
    const areaId = 'tracker-area-' + Math.random().toString(36).substr(2, 9);
    area.dataset.trackerId = areaId;
    this.tags.set(areaId, []);

    // 创建覆盖层
    const overlay = document.createElement('div');
    overlay.className = 'llm-tracker-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      pointer-events: none;
      z-index: 9999;
    `;

    // 设置相对定位
    if (window.getComputedStyle(area).position === 'static') {
      area.style.position = 'relative';
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'llm-tracker-wrapper';
    wrapper.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      pointer-events: none;
      z-index: 9999;
    `;

    overlay.appendChild(wrapper);
    area.appendChild(overlay);
    
    this.wrappers.set(areaId, wrapper);
    this.createButton(wrapper, area, false);
    this.createCollapsedContainer(wrapper, area, false);

    area.addEventListener('scroll', () => this.handleScroll(area, false));
  }

  createButton(wrapper, container, isGlobal) {
    const button = document.createElement('button');
    button.innerHTML = '+';
    button.className = 'llm-tracker-button';
    button.style.pointerEvents = 'auto';
    
    // 统一按钮位置逻辑
    const updateButtonPosition = () => {
      const rect = container.getBoundingClientRect();
      if (isGlobal) {
        button.style.position = 'fixed';
        button.style.top = '50%';
      } else {
        // 对于独立滚动区域，按钮位置跟随滚动
        button.style.position = 'absolute';
        button.style.top = `${container.scrollTop + (container.clientHeight / 2)}px`;
      }
      button.style.right = '20px';
    };

    updateButtonPosition();
    
    // 监听滚动更新按钮位置
    if (!isGlobal) {
      container.addEventListener('scroll', updateButtonPosition);
    }
    window.addEventListener('resize', updateButtonPosition);
    
    button.addEventListener('click', () => this.createTag(container, isGlobal));
    wrapper.appendChild(button);
  }

  createCollapsedContainer(wrapper, container, isGlobal) {
    const collapsedContainer = document.createElement('div');
    collapsedContainer.className = 'llm-tracker-collapsed-container';
    collapsedContainer.style.pointerEvents = 'auto';
    collapsedContainer.style.position = 'fixed'; // 统一使用固定定位
    collapsedContainer.style.right = '20px';
    collapsedContainer.style.top = '20px';
    
    wrapper.appendChild(collapsedContainer);
    this.containers.set(container.dataset?.trackerId || 'global-tracker', collapsedContainer);
  }

  createTag(container, isGlobal) {
    const containerId = container.dataset?.trackerId || 'global-tracker';
    const tags = this.tags.get(containerId);
    this.globalTagCounter++; // 使用全局计数器
    const tagIndex = this.globalTagCounter;

    const tag = document.createElement('div');
    tag.className = 'llm-tracker-tag';
    tag.dataset.index = tagIndex;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'llm-tracker-input';
    input.placeholder = `标签 ${tagIndex}`;
    tag.appendChild(input);

    tag.scrollPosition = isGlobal ? window.scrollY : container.scrollTop;

    // 设置标签位置
    if (isGlobal) {
      tag.style.position = 'fixed';
      tag.style.right = '60px';
      tag.style.top = `${window.innerHeight/2}px`;
    } else {
      tag.style.position = 'absolute';
      tag.style.right = '60px';
      tag.style.top = `${container.scrollTop + container.clientHeight/2}px`;
    }

    const collapsedTag = this.createCollapsedTag(tag, container, isGlobal);
    tag.collapsedTag = collapsedTag;

    this.addTagEventListeners(tag, tags);

    this.wrappers.get(containerId).appendChild(tag);
    tags.push(tag);
    input.focus();
  }

  createCollapsedTag(tag, container, isGlobal) {
    const collapsedTag = document.createElement('div');
    collapsedTag.className = 'llm-tracker-collapsed-tag';
    collapsedTag.innerHTML = tag.dataset.index;
    collapsedTag.style.display = 'none';
    
    // 添加点击计数器
    let clickCount = 0;
    let clickTimer = null;
    
    collapsedTag.addEventListener('click', () => {
      clickCount++;
      
      // 重置计时器
      if (clickTimer) {
        clearTimeout(clickTimer);
      }
      
      // 设置新的计时器，1秒后重置点击计数
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 1000);
      
      // 如果点击次数达到4次，删除标签
      if (clickCount >= 4) {
        const containerId = container.dataset?.trackerId || 'global-tracker';
        const tags = this.tags.get(containerId);
        const tagIndex = tags.indexOf(tag);
        
        if (tagIndex > -1) {
          tags.splice(tagIndex, 1);
          tag.remove();
          collapsedTag.remove();
        }
        return;
      }
      
      // 正常的滚动功能
      if (isGlobal) {
        window.scrollTo({
          top: tag.scrollPosition,
          behavior: 'smooth'
        });
      } else {
        container.scrollTo({
          top: tag.scrollPosition,
          behavior: 'smooth'
        });
      }
    });

    const containerId = container.dataset?.trackerId || 'global-tracker';
    this.containers.get(containerId).appendChild(collapsedTag);
    return collapsedTag;
  }

  handleScroll(container, isGlobal) {
    const containerId = container.dataset?.trackerId || 'global-tracker';
    const tags = this.tags.get(containerId);
    
    if (!tags) return;

    const currentScroll = isGlobal ? window.scrollY : container.scrollTop;
    
    tags.forEach(tag => {
      if (!tag || !tag.collapsedTag) return;
      
      const tagTop = parseInt(tag.style.top);
      const compareTop = isGlobal ? tagTop : tagTop - container.offsetTop;
      
      if (currentScroll > compareTop - 100) {
        tag.style.opacity = '0';
        tag.collapsedTag.style.display = 'flex';
      } else {
        tag.style.opacity = '1';
        tag.collapsedTag.style.display = 'none';
      }
    });
  }

  addTagEventListeners(tag, tags) {
    tag.addEventListener('dblclick', () => {
      const tagIndex = tags.indexOf(tag);
      if (tagIndex > -1) {
        tags.splice(tagIndex, 1);
        tag.collapsedTag.remove();
        tag.remove();
        // 不需要更新索引，因为使用全局计数器
      }
    });
  }

  observeNewScrollableAreas() {
    const observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            shouldRescan = true;
          }
        });
      });

      if (shouldRescan) {
        const scrollableAreas = this.findAllScrollableAreas();
        scrollableAreas.forEach(area => {
          if (!this.processedAreas.has(area)) {
            this.setupScrollableArea(area);
          }
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// 初始化追踪器
new ContextTracker();