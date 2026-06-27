import { useEffect, useRef } from "react";
import type { EChartsOption } from "echarts";

type EChartProps = {
  ariaLabel: string;
  className?: string;
  option: EChartsOption;
};

export function EChart({ ariaLabel, className = "", option }: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || import.meta.env.MODE === "test") {
      return undefined;
    }

    let disposed = false;
    let chart: import("echarts").ECharts | null = null;
    const container = containerRef.current;
    const resizeObserver = new ResizeObserver(() => chart?.resize());

    import("echarts").then((echarts) => {
      if (disposed) {
        return;
      }

      chart = echarts.init(container, undefined, { renderer: "canvas" });
      chart.setOption(option);
      resizeObserver.observe(container);
    });

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      chart?.dispose();
    };
  }, [option]);

  return <div ref={containerRef} className={`echart ${className}`.trim()} role="img" aria-label={ariaLabel} />;
}
