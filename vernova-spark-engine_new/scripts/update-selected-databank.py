import os
import shutil
from pathlib import Path

SRC_BASE = Path(r"C:\Gyan\Onedrive\GEProject\Dashbord_project\src\Databank_Aug17-selected")
DEST_BASE = Path(r"c:\Gyan\Onedrive\GEProject\Dashbord_project\src\vernova-spark-engine_new\public\databank")
PREEVENT_DEST = DEST_BASE / "preevent"

CFGS = ["CFG6", "CFG7", "CFG9"]
EVENTS = ["SCL", "ROCOF", "PHJUMP", "VSTEP"]

def combine_csv(pre_path: Path, post_path: Path, out_path: Path):
    with open(out_path, "wb") as outfile:
        # Read preevent file (includes header)
        with open(pre_path, "rb") as pre_f:
            header_and_pre = pre_f.read()
            outfile.write(header_and_pre)
            if not header_and_pre.endswith(b"\n") and not header_and_pre.endswith(b"\r"):
                outfile.write(b"\n")
        # Read postevent file (skip header line)
        with open(post_path, "rb") as post_f:
            first_line = post_f.readline()  # skip header
            shutil.copyfileobj(post_f, outfile)

def main():
    print(f"Source: {SRC_BASE}")
    print(f"Destination: {DEST_BASE}")
    
    if not SRC_BASE.exists():
        raise FileNotFoundError(f"Source path not found: {SRC_BASE}")
    
    PREEVENT_DEST.mkdir(parents=True, exist_ok=True)
    
    for cfg in CFGS:
        src_graph = SRC_BASE / cfg / "graph"
        dest_cfg = DEST_BASE / cfg
        dest_cfg.mkdir(parents=True, exist_ok=True)
        
        print(f"\n--- Processing {cfg} ---")
        
        for ev in EVENTS:
            pre_src = src_graph / f"{ev}_{cfg}_preevent.csv"
            post_src = src_graph / f"{ev}_{cfg}_postevent.csv"
            
            if not pre_src.exists():
                print(f"  WARNING: {pre_src} not found!")
                continue
            if not post_src.exists():
                print(f"  WARNING: {post_src} not found!")
                continue
                
            pre_dest = dest_cfg / f"{ev}.pre.csv"
            post_dest = dest_cfg / f"{ev}.post.csv"
            full_dest = dest_cfg / f"{ev}.csv"
            
            # Copy pre and post files
            shutil.copy2(pre_src, pre_dest)
            shutil.copy2(post_src, post_dest)
            
            # Create combined full CSV
            combine_csv(pre_src, post_src, full_dest)
            
            print(f"  {ev}:")
            print(f"    pre : {pre_dest.name} ({pre_dest.stat().st_size:,} bytes)")
            print(f"    post: {post_dest.name} ({post_dest.stat().st_size:,} bytes)")
            print(f"    full: {full_dest.name} ({full_dest.stat().st_size:,} bytes)")
            
            # Also update public/databank/preevent/CFG{n}.csv from SCL preevent
            if ev == "SCL":
                preevent_file = PREEVENT_DEST / f"{cfg}.csv"
                shutil.copy2(pre_src, preevent_file)
                print(f"    preevent/{cfg}.csv updated ({preevent_file.stat().st_size:,} bytes)")

    print("\nAll CFG6, CFG7, and CFG9 databank files successfully updated!")

if __name__ == "__main__":
    main()
