// ==UserScript==
// @name         微博广告去质器
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  去除微博网页版广告
// @author       TaihouKai
// @match        https://weibo.com/*
// @updateURL    https://raw.githubusercontent.com/TaihouKai/weibo-ad-remover/main/weibo_ad_remover.js?1=1
// @downloadURL  https://raw.githubusercontent.com/TaihouKai/weibo-ad-remover/main/weibo_ad_remover.js?1=1
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

    // Function to trigger virtual scroller refresh
    function triggerScrollerRefresh() {
        // Try to trigger scroll events to force recalculation
        const scrollContainer = document.querySelector('.vue-recycle-scroller') ||
                               document.querySelector('[class*="scroller"]') ||
                               document.documentElement;

        if (scrollContainer) {
            // Dispatch scroll event to trigger recalculation
            scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));

            // Also try resize event for good measure
            window.dispatchEvent(new Event('resize'));

            // Force a small scroll to trigger layout recalculation
            const currentScroll = scrollContainer.scrollTop || window.pageYOffset;
            if (scrollContainer.scrollTop !== undefined) {
                scrollContainer.scrollTop = currentScroll + 1;
                setTimeout(() => {
                    scrollContainer.scrollTop = currentScroll;
                }, 10);
            } else {
                window.scrollTo(0, currentScroll + 1);
                setTimeout(() => {
                    window.scrollTo(0, currentScroll);
                }, 10);
            }
        }
    }

    // Function to remove target elements
    function removeTargetElements() {
        const targetElements = document.querySelectorAll('div.vue-recycle-scroller__item-view');
        let removedCount = 0;

        targetElements.forEach(element => {
            if (containsAdDiv(element)) {
                console.log('Removing element:', element);
                console.log('Element HTML:', element.outerHTML.substring(0, 200) + '...');
                element.remove();
                removedCount++;
            }
        });

        if (removedCount > 0) {
            console.log(`Total removed: ${removedCount} vue-recycle-scroller__item-view elements containing "荐读"`);

            // Trigger virtual scroller refresh after removal
            setTimeout(() => {
                triggerScrollerRefresh();
            }, 50);
        }
    }

    // Initial cleanup
    removeTargetElements();

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
    setInterval(removeTargetElements, 2000);

})();
