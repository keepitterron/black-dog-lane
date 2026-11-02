import { DOG_BOX, dogSvgInner, type DogCarry, type DogPose } from '../../art/dog.ts'
import { useReducedMotion } from '../useReducedMotion.ts'

type Props = { pose: DogPose; facing?: 'left' | 'right'; carrying?: DogCarry | null; className?: string | undefined }

export function Dog({ pose, facing = 'right', carrying = null, className }: Props) {
  const motion = !useReducedMotion()
  return (
    <svg
      className={className}
      viewBox={`0 0 ${DOG_BOX.width} ${DOG_BOX.height}`}
      role="img"
      aria-label="The dog"
      dangerouslySetInnerHTML={{ __html: dogSvgInner({ pose, facing, carrying, motion }) }}
    />
  )
}
