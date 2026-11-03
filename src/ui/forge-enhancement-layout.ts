// Layout only. Model, review and commits remain in ForgeWorkbench / the host.
export class ForgeEnhancementLayout {
  private observer:ResizeObserver|undefined;
  private surface:HTMLElement|undefined;
  private frame=0;
  disconnect():void {
    this.observer?.disconnect();this.observer=undefined;this.surface=undefined;
    cancelAnimationFrame(this.frame);
  }
  mount(root:HTMLElement,scroll:number):void {
    const surface=root.querySelector<HTMLElement>('.forge-enhancement');if(!surface)return;
    this.surface=surface;
    const update=()=>{if(this.surface===surface)this.update(surface);};
    this.observer=new ResizeObserver(update);
    const sheet=surface.closest<HTMLElement>('.lobby-sheet')!;
    this.observer.observe(sheet);this.observer.observe(sheet.querySelector('.lobby-sheet-head')!);
    update();surface.querySelector('.forge-enhancement-content')!.scrollTop=scroll;
    this.frame=requestAnimationFrame(()=>{update();if(this.surface===surface)surface.querySelector('.forge-enhancement-content')!.scrollTop=scroll;});
    void surface.ownerDocument.fonts.ready.then(update);
  }
  private update(surface:HTMLElement):void {
    const body=surface.querySelector<HTMLElement>('.forge-enhancement-content')!,dock=surface.querySelector<HTMLElement>('.forge-enhancement-dock')!;
    const sheet=surface.closest<HTMLElement>('.lobby-sheet')!;
    const large=parseFloat(getComputedStyle(surface).fontSize)>=21;
    surface.classList.toggle('forge-text-large',large);
    const compact=large&&sheet.clientHeight<720;
    const cost=surface.querySelector<HTMLElement>('.forge-cost-summary')!;
    if(compact&&cost.parentElement===dock){if(surface.dataset.review==='true')body.prepend(cost);else body.insertBefore(cost,body.querySelector('.forge-secondary-details'));}
    else if(!compact&&cost.parentElement!==dock)dock.prepend(cost);
    surface.classList.toggle('forge-compact-cost',compact);
    const step=surface.querySelector<HTMLElement>('.forge-step');if(!step)return;
    const caption=step.querySelector<HTMLElement>('.forge-step-caption')!;
    const a=step.getBoundingClientRect(),b=caption.getBoundingClientRect();
    step.classList.toggle('forge-hide-wings',b.left<a.left+52||b.right>a.right-52||b.height>24);
  }
}
