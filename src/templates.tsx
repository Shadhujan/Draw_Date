import { TEMPLATE_IDS, type TemplateId } from './types';
import { drawingLessons } from './drawingLessons';
import './drawingLessons.css';

export const templates = TEMPLATE_IDS.map((id) => {
  if (id === 'blank') return { id, name: 'Freestyle', subtitle: 'The canvas is yours', emoji: '✧' };
  const lesson = drawingLessons[id];
  return { id, name: lesson.name, subtitle: `${lesson.steps.length} steps · ${lesson.subtitle}`, emoji: lesson.emoji };
});

export function GuideArt({ template, className = '', step }: {
  template: TemplateId; className?: string; step?: number;
}) {
  if (template === 'blank') return null;
  const phase = (index: number) => step === undefined ? '' :
    index === step ? 'current' : index < step ? 'done' : 'upcoming';
  return (
    <svg viewBox="0 0 1000 700" className={className} aria-hidden="true"
      data-guided={step !== undefined || undefined} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <g fill="none" stroke="#cb96a5" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
        {drawingLessons[template].steps.map((part, index) => (
          <g key={index} data-guide-step={index} className={phase(index)}>
            {part.shapes.map((shape, shapeIndex) => 'path' in shape
              ? <path key={shapeIndex} d={shape.path} strokeWidth={shape.width} />
              : <circle key={shapeIndex} cx={shape.circle[0]} cy={shape.circle[1]} r={shape.circle[2]} strokeWidth={shape.width} />)}
          </g>
        ))}
      </g>
    </svg>
  );
}
