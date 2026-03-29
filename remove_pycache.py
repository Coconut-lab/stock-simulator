import os
import shutil

root = os.path.dirname(os.path.abspath(__file__))

removed = 0
for dirpath, dirnames, filenames in os.walk(root):
    # __pycache__ 디렉토리 삭제
    if '__pycache__' in dirnames:
        target = os.path.join(dirpath, '__pycache__')
        shutil.rmtree(target)
        print(f"삭제: {target}")
        removed += 1
        dirnames.remove('__pycache__')

    # .pyc, .pyo 파일 삭제
    for f in filenames:
        if f.endswith(('.pyc', '.pyo')):
            target = os.path.join(dirpath, f)
            os.remove(target)
            print(f"삭제: {target}")
            removed += 1

print(f"\n완료: {removed}개 삭제됨")
