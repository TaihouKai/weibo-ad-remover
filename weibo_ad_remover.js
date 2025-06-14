// ==UserScript==
// @name         微博广告去质器
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  去除微博网页版广告
// @author       TaihouKai
// @match        https://weibo.com/*
// @updateURL    https://raw.githubusercontent.com/TaihouKai/weibo-ad-remover/main/weibo_ad_remover.js?a=1
// @downloadURL  https://raw.githubusercontent.com/TaihouKai/weibo-ad-remover/main/weibo_ad_remover.js?a=1
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Function to check if an element contains a div with ad text
    function containsAdDiv(element) {
        // List of ad keywords to check for
        const adKeywords = ['荐读', '推荐'];

        // Check all div descendants
        const divs = element.querySelectorAll('div');
        for (let div of divs) {
            const text = div.textContent.trim();
            if (adKeywords.includes(text)) {
                return true;
            }
        }
        return false;
    }

    // Function to properly refresh virtual scroller
    function refreshVirtualScroller() {
        // Find the virtual scroller component
        const scrollerWrapper = document.querySelector('.vue-recycle-scroller');
        if (!scrollerWrapper) return;

        // Try to find Vue component instance
        const vueInstance = scrollerWrapper.__vue__ || 
                           scrollerWrapper._vueParentComponent ||
                           scrollerWrapper.__vueParentComponent;

        if (vueInstance) {
            // If we can access Vue instance, call its update methods
            if (typeof vueInstance.updateVisibleItems === 'function') {
                vueInstance.updateVisibleItems();
            }
            if (typeof vueInstance.$forceUpdate === 'function') {
                vueInstance.$forceUpdate();
            }
            if (typeof vueInstance.forceUpdate === 'function') {
                vueInstance.forceUpdate();
            }
        }

        // Trigger DOM events that might cause recalculation
        const events = ['scroll', 'resize', 'input'];
        events.forEach(eventType => {
            scrollerWrapper.dispatchEvent(new Event(eventType, { bubbles: true }));
            window.dispatchEvent(new Event(eventType));
        });

        // Force layout recalculation by temporarily changing scroll position
        const scrollContainer = scrollerWrapper.querySelector('.vue-recycle-scroller__item-wrapper') || scrollerWrapper;
        const currentScroll = scrollContainer.scrollTop || window.pageYOffset;
        
        if (scrollContainer.scrollTop !== undefined) {
            scrollContainer.scrollTop = currentScroll + 1;
            requestAnimationFrame(() => {
                scrollContainer.scrollTop = currentScroll;
            });
        } else {
            window.scrollTo(0, currentScroll + 1);
            requestAnimationFrame(() => {
                window.scrollTo(0, currentScroll);
            });
        }

        // Try to trigger Vue's reactivity system
        const itemWrapper = document.querySelector('.vue-recycle-scroller__item-wrapper');
        if (itemWrapper) {
            // Force a style recalculation
            const originalDisplay = itemWrapper.style.display;
            itemWrapper.style.display = 'none';
            itemWrapper.offsetHeight; // Trigger reflow
            itemWrapper.style.display = originalDisplay;
        }
    }

    // Function to remove empty spacer elements that might be left behind
    function removeEmptySpacers() {
        // Remove empty item views
        const emptyItems = document.querySelectorAll('.vue-recycle-scroller__item-view:empty');
        emptyItems.forEach(item => item.remove());

        // Remove items with only whitespace
        const allItems = document.querySelectorAll('.vue-recycle-scroller__item-view');
        allItems.forEach(item => {
            if (item.textContent.trim() === '' && item.children.length === 0) {
                item.remove();
            }
        });

        // Look for and remove spacer divs that might be left behind
        const spacers = document.querySelectorAll('.vue-recycle-scroller__item-wrapper > div[style*="height"]');
        spacers.forEach(spacer => {
            if (spacer.children.length === 0 || spacer.textContent.trim() === '') {
                spacer.remove();
            }
        });
    }

    // Function to remove target elements
    function removeTargetElements() {
        const targetElements = document.querySelectorAll('div.vue-recycle-scroller__item-view');
        let removedCount = 0;

        targetElements.forEach(element => {
            if (containsAdDiv(element)) {
                console.log('Removing element:', element);
                console.log('Element HTML:', element.outerHTML.substring(0, 200) + '...');
                
                // Mark the element for removal instead of immediate removal
                element.style.display = 'none';
                element.setAttribute('data-removed-by-adblock', 'true');
                
                // Actually remove after a short delay
                setTimeout(() => {
                    if (element.parentNode) {
                        element.remove();
                    }
                }, 10);
                
                removedCount++;
            }
        });

        if (removedCount > 0) {
            console.log(`Total removed: ${removedCount} vue-recycle-scroller__item-view elements containing ad keywords`);

            // Clean up empty spacers and refresh the scroller
            setTimeout(() => {
                removeEmptySpacers();
                refreshVirtualScroller();
            }, 50);

            // Second pass to ensure everything is cleaned up
            setTimeout(() => {
                removeEmptySpacers();
                refreshVirtualScroller();
            }, 200);
        }
    }

    // Initial cleanup
    setTimeout(removeTargetElements, 1000);

    // Set up a MutationObserver to handle dynamically added content
    const observer = new MutationObserver(function(mutations) {
        let shouldCheck = false;

        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the added node is a target element or contains target elements
                        if (node.classList && node.classList.contains('vue-recycle-scroller__item-view')) {
                            shouldCheck = true;
                        } else if (node.querySelectorAll && node.querySelectorAll('div.vue-recycle-scroller__item-view').length > 0) {
                            shouldCheck = true;
                        }
                    }
                });
            }
        });

        if (shouldCheck) {
            // Use a small delay to ensure DOM is fully updated
            setTimeout(removeTargetElements, 100);
        }
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also run periodically as a fallback for dynamic content
    setInterval(removeTargetElements, 3000);

    // Additional cleanup on scroll to catch any missed elements
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            removeEmptySpacers();
        }, 500);
    });

})();