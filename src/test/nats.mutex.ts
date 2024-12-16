export class MutexForTest {
  private lock = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void;
    const newLock = new Promise<void>(resolve => (release = resolve));
    const currentLock = this.lock;
    this.lock = newLock;
    await currentLock;
    return release!;
  }
}