import { fontFamily } from './fonts';
import { useId } from "react";
import type { DesignObject } from "./model";
import { curveLayout, curveTransform, TEXT_EM } from "./textCurve";
import { richText, styledTextMarkup } from './richText';

export function CurvedText({
  object,
  paint,
}: {
  object: DesignObject;
  paint: React.SVGProps<SVGTextElement>;
}) {
  const id = `text-curve-${useId()}`;
  if (richText(object)) return <g dangerouslySetInnerHTML={{__html: styledTextMarkup(object, `fill="${paint.fill}" stroke="${paint.stroke}" stroke-width="${paint.strokeWidth || 1.5}"`, id)}} />;
  const layout = curveLayout(object);
  return (
    <g data-curved-text="true" transform={curveTransform(object, layout.box)}>
      <defs>
        <path id={id} d={layout.path} />
      </defs>
      <text
        fontFamily={fontFamily(object.font)}
        fontSize={TEXT_EM}
        fontStyle={object.italic ? "italic" : "normal"}
        {...paint}
      >
        <textPath
          href={`#${id}`}
          textLength={layout.length}
          lengthAdjust="spacingAndGlyphs"
        >
          {object.text}
        </textPath>
      </text>
    </g>
  );
}
