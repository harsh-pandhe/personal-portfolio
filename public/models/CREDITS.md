# 3D model credits

- `robot.glb` — "RobotExpressive" by Tomás Laulhé (modifications by Don McCurdy), from the three.js examples, licensed CC0 1.0. Meshopt-compressed.
- `people/*.glb` — "KayKit: Adventurers Character Pack 1.0" by Kay Lousberg (www.kaylousberg.com), CC0 1.0. Weapons and helmets removed; bodies and a shared animation library split out and meshopt-compressed.
- `city/car_*.glb`, `city/building_*.glb` — "KayKit: City Builder Bits 1.0" by Kay Lousberg (www.kaylousberg.com), CC0 1.0. Meshopt-compressed.

## robot-arm.glb

Six-axis industrial arm modelled for this site in Blender 5.2 (source: `assets-src/robot-arm.blend`, scene "PortfolioArm"). Joints `J1`–`J6`, `FingerL`, `FingerR` are animated in `app/island/Landmarks.tsx`. Original work, same licence as the site.

## ship-cargo.glb, ship-ferry.glb, ship-sail.glb, trees.glb, ropeway-station.glb

Modelled for this site in Blender 5.2 by `assets-src/scripts/island_props.py` (run `blender -b --python assets-src/scripts/island_props.py -- .` from the repo root to rebuild). Ships carry named materials (`NavRed`, `NavGreen`, `NavWhite`, `ShipWindows`) that `app/island/Env.tsx` lights at night; `trees.glb` holds `<Species>_Trunk` / `<Species>_Crown` meshes for Oak, Pine, Cypress and Palm, instanced and tinted per tree. Original work, same licence as the site.
