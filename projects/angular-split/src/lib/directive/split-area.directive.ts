import { Directive, ElementRef, Input, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core'
import { Subscription } from 'rxjs'
import { SplitComponent } from '../component/split.component'
import { getInputBoolean, getInputPositiveNumber } from '../utils'
import { IAreaSize } from '../interface'

@Directive({
  selector: 'as-split-area, [as-split-area]',
  exportAs: 'asSplitArea',
})
export class SplitAreaDirective implements OnInit, OnDestroy {
  private _order: number | null = null

  @Input() set order(v: number | `${number}` | null | undefined) {
    this._order = getInputPositiveNumber(v, null)

    this.split.updateArea(this, true, false)
  }

  get order(): number | null {
    return this._order
  }

  private _size: IAreaSize = '*'

  @Input() set size(v: IAreaSize | `${number}` | null | undefined) {
    this._size = getInputPositiveNumber(v, '*')

    this.split.updateArea(this, false, true)
  }

  get size(): IAreaSize {
    return this._size
  }

  private _minSize: number | null = null

  @Input() set minSize(v: number | `${number}` | null | undefined) {
    this._minSize = getInputPositiveNumber(v, null)

    this.split.updateArea(this, false, true)
  }

  get minSize(): number | null {
    return this._minSize
  }

  private _maxSize: number | null = null

  @Input() set maxSize(v: number | `${number}` | null | undefined) {
    this._maxSize = getInputPositiveNumber(v, null)

    this.split.updateArea(this, false, true)
  }

  get maxSize(): number | null {
    return this._maxSize
  }

  private _lockSize = false

  @Input() set lockSize(v: boolean | `${boolean}`) {
    this._lockSize = getInputBoolean(v)

    this.split.updateArea(this, false, true)
  }

  get lockSize(): boolean {
    return this._lockSize
  }

  private _visible = true

  @Input() set visible(v: boolean | `${boolean}`) {
    this._visible = getInputBoolean(v)

    if (this._visible) {
      this.split.showArea(this)
      this.renderer.removeClass(this.elRef.nativeElement, 'as-hidden')
    } else {
      this.split.hideArea(this)
      this.renderer.addClass(this.elRef.nativeElement, 'as-hidden')
    }
  }

  get visible(): boolean {
    return this._visible
  }

  private transitionListener: Function
  private dragStartSubscription: Subscription
  private dragEndSubscription: Subscription
  private readonly lockListeners: Array<Function> = []

  constructor(
    private ngZone: NgZone,
    public elRef: ElementRef,
    private renderer: Renderer2,
    private split: SplitComponent,
  ) {
    this.renderer.addClass(this.elRef.nativeElement, 'as-split-area')
  }

  public ngOnInit(): void {
    this.split.addArea(this)

    this.ngZone.runOutsideAngular(() => {
      this.transitionListener = this.renderer.listen(
        this.elRef.nativeElement,
        'transitionend',
        (event: TransitionEvent) => {
          // Limit only flex-basis transition to trigger the event
          if (event.propertyName === 'flex-basis') {
            this.split.notify('transitionEnd', -1)
          }
        },
      )
    })

    const iframeFixDiv = this.renderer.createElement('div')
    this.renderer.addClass(iframeFixDiv, 'iframe-fix')

    this.dragStartSubscription = this.split.dragStart.subscribe(() => {
      this.renderer.setStyle(this.elRef.nativeElement, 'position', 'relative')
      this.renderer.appendChild(this.elRef.nativeElement, iframeFixDiv)
    })

    this.dragEndSubscription = this.split.dragEnd.subscribe(() => {
      this.renderer.removeStyle(this.elRef.nativeElement, 'position')
      this.renderer.removeChild(this.elRef.nativeElement, iframeFixDiv)
    })
  }

  public setStyleOrder(value: number): void {
    this.renderer.setStyle(this.elRef.nativeElement, 'order', value)
  }

  public setStyleFlex(grow: number, shrink: number, basis: string, isMin: boolean, isMax: boolean): void {
    // Need 3 separated properties to work on IE11 (https://github.com/angular/flex-layout/issues/323)
    this.renderer.setStyle(this.elRef.nativeElement, 'flex-grow', grow)
    this.renderer.setStyle(this.elRef.nativeElement, 'flex-shrink', shrink)
    this.renderer.setStyle(this.elRef.nativeElement, 'flex-basis', basis)

    if (isMin === true) {
      this.renderer.addClass(this.elRef.nativeElement, 'as-min')
    } else {
      this.renderer.removeClass(this.elRef.nativeElement, 'as-min')
    }

    if (isMax === true) {
      this.renderer.addClass(this.elRef.nativeElement, 'as-max')
    } else {
      this.renderer.removeClass(this.elRef.nativeElement, 'as-max')
    }
  }

  public lockEvents(): void {
    this.ngZone.runOutsideAngular(() => {
      this.lockListeners.push(this.renderer.listen(this.elRef.nativeElement, 'selectstart', () => false))
      this.lockListeners.push(this.renderer.listen(this.elRef.nativeElement, 'dragstart', () => false))
    })
  }

  public unlockEvents(): void {
    while (this.lockListeners.length > 0) {
      const fct = this.lockListeners.pop()
      if (fct) {
        fct()
      }
    }
  }

  public ngOnDestroy(): void {
    this.unlockEvents()

    if (this.transitionListener) {
      this.transitionListener()
    }

    this.dragStartSubscription?.unsubscribe()
    this.dragEndSubscription?.unsubscribe()

    this.split.removeArea(this)
  }

  public collapse(newSize = 0, gutter: 'left' | 'right' = 'right'): void {
    this.split.collapseArea(this, newSize, gutter)
  }

  public expand(): void {
    this.split.expandArea(this)
  }
}
