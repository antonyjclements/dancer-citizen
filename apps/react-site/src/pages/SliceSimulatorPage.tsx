import { useEffect, useState } from "react";
import type { SliceZone } from "@prismicio/client";
import { SimulatorManager, StateEventType, simulatorClass, simulatorRootClass } from "@prismicio/simulator/kit";
import type { BookReviewsSlice } from "../../../../prismicio-types";
import { RichTextEmbedsEnabled } from "../components/RichText";
import { Slices } from "../components/Slices";
import { stripLegacyHtml } from "../text";

const simulator = new SimulatorManager();

function previewSlice(slice: SliceZone[number]) {
  if (slice.slice_type !== "BookReviews") return slice;

  const { items } = slice as BookReviewsSlice;
  return {
    ...slice,
    items: (items ?? []).flatMap((item) => {
      const title = stripLegacyHtml(item.title);
      if (!title) return [];
      return [{
        title,
        href: "#",
        bookAuthor: stripLegacyHtml(item.book_author),
        reviewer: stripLegacyHtml(item.reviewer),
        summary: stripLegacyHtml(item.summary),
        cover: item.image?.url ? {
          url: item.image.url,
          alt: item.image.alt || `${title} cover`,
          dimensions: item.image.dimensions,
        } : null,
      }];
    }),
  };
}

export default function SliceSimulatorPage() {
  const [slices, setSlices] = useState<SliceZone>([]);
  const isEmbedded = window.parent !== window;

  useEffect(() => {
    if (!isEmbedded) return;

    simulator.state.on(StateEventType.Slices, setSlices);
    void simulator.init();
    return () => simulator.state.off(StateEventType.Slices, setSlices);
  }, [isEmbedded]);

  return (
    <main className={simulatorClass}>
      <div className={`body ${simulatorRootClass}`} style={{ padding: 16 }}>
        {isEmbedded ? (
          <RichTextEmbedsEnabled.Provider value={false}>
            <div data-slice-zone onClickCapture={(event) => {
              if (event.target instanceof Element && event.target.closest("a")) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}>
              {slices.map((slice, index) => (
                <div key={`${slice.slice_type}-${index}`}><Slices slices={[previewSlice(slice)]} /></div>
              ))}
            </div>
          </RichTextEmbedsEnabled.Provider>
        ) : <p>Open a page in the Prismic editor to preview its slices here.</p>}
      </div>
    </main>
  );
}
