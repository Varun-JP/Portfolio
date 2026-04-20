import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * useScrollZoom
 * Scroll-triggered zoom + fade animation on a single element or array of elements.
 *
 * @param {React.RefObject | React.RefObject[]} targetRef - ref(s) pointing to DOM element(s)
 * @param {Object} options
 *   @param {Object}  fromVars   - GSAP vars for the "from" state
 *   @param {Object}  toVars     - GSAP vars for the "to"   state
 *   @param {number}  duration   - animation duration in seconds
 *   @param {string}  ease       - GSAP easing string
 *   @param {number}  stagger    - stagger delay between elements (0 = no stagger)
 *   @param {number}  delay      - delay before animation starts
 *   @param {string}  start      - ScrollTrigger start position
 *   @param {React.RefObject} triggerRef - optional separate trigger element
 * @param {any[]} deps - extra deps that should re-run the animation (e.g. filter state)
 */
export const useScrollZoom = (targetRef, options = {}, deps = []) => {
  useLayoutEffect(() => {
    const {
      fromVars = { opacity: 0, scale: 0.85, y: 50 },
      toVars   = { opacity: 1, scale: 1,    y: 0  },
      duration = 1,
      ease     = "power3.out",
      stagger  = 0,
      delay    = 0,
      start    = "top 85%",
      triggerRef = null,
    } = options;

    const getEl = (ref) => ref?.current;

    const elements = Array.isArray(targetRef)
      ? targetRef.map(getEl).filter(Boolean)
      : [getEl(targetRef)].filter(Boolean);

    if (!elements.length) return;

    const trigger = triggerRef?.current || elements[0];
    const targets = stagger > 0 ? elements : elements[0];

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        fromVars,
        {
          ...toVars,
          duration,
          ease,
          delay,
          stagger,
          scrollTrigger: {
            trigger,
            start,
            once: true,
          },
        }
      );
    });

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
