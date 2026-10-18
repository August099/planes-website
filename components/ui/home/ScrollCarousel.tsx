"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CarouselArrow } from "@/components/ui/home/CarouselArrow";

// Carrusel de la Home con scroll nativo (CSS scroll-snap), en vez de Swiper (rendimiento, VA-76):
// Swiper medía y movía cada slide al hidratar (recálculos de layout forzados) y sumaba ~80 KB de JS.
// Las tarjetas llegan en el HTML del servidor; acá solo viven las flechas y los puntos de VA-139.
// En celular se desliza con el dedo y se asoma la tarjeta siguiente (lo define slideClassName).
type Props = {
  children: ReactNode;
  /** Ancho de cada tarjeta por tamaño de pantalla (clases literales de Tailwind). */
  slideClassName: string;
  /** Separación entre tarjetas (gap-*), la misma que se descuenta en slideClassName. */
  gapClassName: string;
  label: string;
  className?: string;
};

export function ScrollCarousel({ children, slideClassName, gapClassName, label, className = "" }: Props) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ positions: 0, active: 0 });

  // Paso = distancia entre el comienzo de dos tarjetas; las posiciones salen del ancho que sobra.
  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.children.length === 0) return;
    const first = el.children[0] as HTMLElement;
    const second = el.children[1] as HTMLElement | undefined;
    const step = second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
    const max = el.scrollWidth - el.clientWidth;
    const positions = max > 1 && step > 0 ? Math.round(max / step) + 1 : 0;
    const active = el.scrollLeft >= max - 2 ? positions - 1 : Math.round(el.scrollLeft / Math.max(step, 1));
    setState((s) => (s.positions === positions && s.active === active ? s : { positions, active }));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    // Al cambiar de tamaño (y al montar) se mide directo: ResizeObserver ya corre después del layout.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, [measure]);

  const stepOf = (el: HTMLUListElement) => {
    const [a, b] = Array.from(el.children) as HTMLElement[];
    return b ? b.offsetLeft - a.offsetLeft : el.clientWidth;
  };
  const go = (index: number) => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: index * stepOf(el), behavior: "smooth" });
  };
  const by = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * stepOf(el), behavior: "smooth" });
  };

  const { positions, active } = state;
  return (
    <div className={`relative ${className}`} role="region" aria-roledescription="carrusel" aria-label={label}>
      <CarouselArrow direction="prev" onClick={() => by(-1)} disabled={positions === 0 || active === 0} />
      <ul
        ref={trackRef}
        className={`flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-2 va-no-scrollbar motion-safe:scroll-smooth ${gapClassName}`}
      >
        {Children.map(children, (child) => (
          <li className={`flex shrink-0 snap-start [&>*]:w-full ${slideClassName}`}>{child}</li>
        ))}
      </ul>
      <CarouselArrow direction="next" onClick={() => by(1)} disabled={positions === 0 || active >= positions - 1} />
      {positions > 1 && (
        <div className="va-dots mt-4 flex flex-wrap justify-center gap-1.5">
          {Array.from({ length: positions }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir a la posición ${i + 1} de ${positions}`}
              aria-current={i === active ? "true" : undefined}
              onClick={() => go(i)}
              className={i === active ? "va-dot va-dot-active" : "va-dot"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
