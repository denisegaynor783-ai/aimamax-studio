// ============================================================
// AIMAMAX Studio — 3D 导演台（previz 舞台 + 镜头时间线）
// R3F 渲染 / 可放置与变换 3D 对象 / 机位截图关键帧 / 回灌画布与资产
// ============================================================
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, TransformControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useStudio } from "../lib/store";
import type { StageObject, Vec3 } from "../lib/types";
import { Button, IconButton, EmptyState } from "../components/ui";
import {
  IconCharacter,
  IconScene,
  IconCube,
  IconSpark,
  IconFilm,
  IconTrash,
  IconImage,
  IconSave,
} from "../components/icons";

// —— WebGL 失败兜底 ——
class StageErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { has: boolean }> {
  state = { has: false };
  static getDerivedStateFromError() {
    return { has: true };
  }
  render() {
    return this.state.has ? this.props.fallback : this.props.children;
  }
}

function WebGLFallback() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "var(--text-dim)" }}>
      <div>
        <IconCube size={34} />
        <div style={{ marginTop: 10, fontWeight: 600, color: "var(--text)" }}>当前环境未启用 WebGL</div>
        <div style={{ marginTop: 6, fontSize: 13 }}>3D 导演台需要支持 WebGL 的浏览器（Chrome / Edge / Safari）。请用桌面端浏览器打开。</div>
      </div>
    </div>
  );
}

// —— 截图 / 机位桥接 ——
interface StageApi {
  capture: () => string;
  getView: () => { pos: Vec3; target: Vec3 };
  setView: (v: { pos: Vec3; target: Vec3 }) => void;
}

function CaptureBridge({ register }: { register: (api: StageApi) => void }) {
  const { gl, scene, camera } = useThree();
  const controls = useThree((s) => s.controls) as unknown as
    | { target: THREE.Vector3; update: () => void }
    | null;
  useEffect(() => {
    register({
      capture: () => {
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/png");
      },
      getView: () => ({
        pos: camera.position.toArray() as Vec3,
        target: controls ? (controls.target.toArray() as Vec3) : [0, 0, 0],
      }),
      setView: (v) => {
        camera.position.set(v.pos[0], v.pos[1], v.pos[2]);
        if (controls) {
          controls.target.set(v.target[0], v.target[1], v.target[2]);
          controls.update();
        }
      },
    });
  }, [gl, scene, camera, controls, register]);
  return null;
}

// —— 单个 3D 对象的视觉 ——
function StageVisual({ obj }: { obj: StageObject }) {
  const mat = <meshStandardMaterial color={obj.color} roughness={0.55} metalness={0.05} />;
  if (obj.shape === "humanoid") {
    return (
      <>
        <mesh position={[0, 0.95, 0]} castShadow>
          <capsuleGeometry args={[0.32, 1.1, 6, 14]} />
          {mat}
        </mesh>
        <mesh position={[0, 1.9, 0]}>
          <sphereGeometry args={[0.32, 18, 18]} />
          {mat}
        </mesh>
      </>
    );
  }
  if (obj.shape === "box") {
    return (
      <mesh receiveShadow castShadow>
        <boxGeometry args={[1, 1, 1]} />
        {mat}
      </mesh>
    );
  }
  if (obj.shape === "cylinder") {
    return (
      <mesh castShadow>
        <cylinderGeometry args={[0.4, 0.4, 1, 18]} />
        {mat}
      </mesh>
    );
  }
  if (obj.shape === "cone") {
    return (
      <mesh castShadow>
        <coneGeometry args={[0.5, 1, 18]} />
        {mat}
      </mesh>
    );
  }
  // sphere（灯光标记 / 球）
  if (obj.type === "light") {
    return (
      <>
        <pointLight intensity={obj.intensity ?? 2} distance={24} color={obj.color} />
        <mesh>
          <sphereGeometry args={[0.5, 18, 18]} />
          <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={2.4} />
        </mesh>
      </>
    );
  }
  return (
    <mesh castShadow>
      <sphereGeometry args={[0.5, 18, 18]} />
      {mat}
    </mesh>
  );
}

function StageObjectMesh({
  obj,
  selected,
  mode,
  onSelect,
  onTransform,
}: {
  obj: StageObject;
  selected: boolean;
  mode: "translate" | "rotate" | "scale";
  onSelect: (id: string) => void;
  onTransform: (id: string, patch: Partial<StageObject>) => void;
}) {
  const ref = useRef<THREE.Group>(null!);
  const tcRef = useRef<{ addEventListener: (e: string, cb: () => void) => void; removeEventListener: (e: string, cb: () => void) => void } | null>(null);

  useEffect(() => {
    const tc = tcRef.current;
    if (!tc) return;
    const commit = () => {
      const g = ref.current;
      onTransform(obj.id, {
        position: g.position.toArray() as Vec3,
        rotation: [g.rotation.x, g.rotation.y, g.rotation.z],
        scale: g.scale.toArray() as Vec3,
      });
    };
    tc.addEventListener("mouseUp", commit);
    tc.addEventListener("objectChange", commit);
    return () => {
      tc.removeEventListener("mouseUp", commit);
      tc.removeEventListener("objectChange", commit);
    };
  }, [selected, obj.id, onTransform]);

  return (
    <>
      <group
        ref={ref}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect(obj.id);
        }}
      >
        <StageVisual obj={obj} />
      </group>
      {selected && ref.current && (
        <TransformControls ref={tcRef as never} object={ref.current} mode={mode} />
      )}
    </>
  );
}

// —— 场景内容 ——
function StageScene({
  objects,
  selectedId,
  mode,
  onSelect,
  onTransform,
}: {
  objects: StageObject[];
  selectedId: string | null;
  mode: "translate" | "rotate" | "scale";
  onSelect: (id: string) => void;
  onTransform: (id: string, patch: Partial<StageObject>) => void;
}) {
  return (
    <>
      <color attach="background" args={["#070709"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[7, 11, 6]} intensity={0.9} castShadow />
      <hemisphereLight intensity={0.25} groundColor="#1a1320" />
      <Grid
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#22222c"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#ff6b1a"
        fadeDistance={48}
        fadeStrength={1.5}
        infiniteGrid
      />
      {objects.map((o) => (
        <StageObjectMesh
          key={o.id}
          obj={o}
          selected={selectedId === o.id}
          mode={mode}
          onSelect={onSelect}
          onTransform={onTransform}
        />
      ))}
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI / 2.05} />
    </>
  );
}

// —— 右侧检视器 ——
function StageInspector() {
  const { stageObjects, selectedStageId, updateStageObject, removeStageObject, addStageObject } = useStudio();
  const obj = stageObjects.find((o) => o.id === selectedStageId);
  if (!obj) {
    return (
      <div className="stage-inspector__empty">
        <IconCube size={26} />
        <div className="eyebrow" style={{ marginTop: 10 }}>未选中对象</div>
        <p className="muted">
          从左侧「放置」添加角色 / 场景台 / 道具 / 灯光，点击舞台中的物体即可选中并变换。
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <Button size="sm" variant="ghost" icon={<IconCharacter size={14} />} onClick={() => addStageObject("actor")}>加角色</Button>
          <Button size="sm" variant="ghost" icon={<IconScene size={14} />} onClick={() => addStageObject("set")}>加场景</Button>
        </div>
      </div>
    );
  }
  const typeLabel: Record<string, string> = { actor: "角色", set: "场景台", prop: "道具", light: "灯光" };
  return (
    <div className="stage-inspector__body">
      <div className="eyebrow">对象属性</div>
      <label className="field">
        <span className="field__label">名称</span>
        <input className="input" value={obj.name} onChange={(e) => updateStageObject(obj.id, { name: e.target.value })} />
      </label>
      <div className="field">
        <span className="field__label">类型</span>
        <div className="badge">{typeLabel[obj.type]}</div>
      </div>
      <label className="field">
        <span className="field__label">颜色</span>
        <input
          type="color"
          className="stage-color"
          value={obj.color}
          onChange={(e) => updateStageObject(obj.id, { color: e.target.value })}
        />
      </label>
      {obj.type === "light" && (
        <label className="field">
          <span className="field__label">强度 {obj.intensity ?? 2}</span>
          <input
            type="range"
            min={0}
            max={6}
            step={0.1}
            value={obj.intensity ?? 2}
            onChange={(e) => updateStageObject(obj.id, { intensity: Number(e.target.value) })}
          />
        </label>
      )}
      <Button variant="danger" size="sm" icon={<IconTrash size={14} />} onClick={() => removeStageObject(obj.id)} style={{ marginTop: 8 }}>
        删除对象
      </Button>
    </div>
  );
}

// —— 镜头时间线卡片 ——
function ShotCard({ shot, onView }: { shot: import("../lib/types").StageShot; onView: (s: import("../lib/types").StageShot) => void }) {
  const { generateShotKeyframe, sendShotToCanvas, collectShot, removeShot } = useStudio();
  const busy = shot.keyframeStatus === "pending";
  return (
    <div className="shotcard">
      <div className="shotcard__frame">
        {shot.keyframeUrl ? (
          <img src={shot.keyframeUrl} alt={shot.name} />
        ) : (
          <img src={shot.thumb} alt={shot.name} />
        )}
        <span className="shotcard__tag">{shot.keyframeUrl ? "AI 关键帧" : "3D 预演"}</span>
      </div>
      <div className="shotcard__name">{shot.name}</div>
      <div className="shotcard__actions">
        <button className="iconbtn-sm" title="回到该机位" onClick={() => onView(shot)}><IconFilm size={14} /></button>
        <button className="iconbtn-sm" title="生成 AI 关键帧" disabled={busy} onClick={() => generateShotKeyframe(shot.id)}>
          <IconSpark size={14} />
        </button>
        <button className="iconbtn-sm" title="发送到画布" onClick={() => sendShotToCanvas(shot.id)}><IconImage size={14} /></button>
        <button className="iconbtn-sm" title="收藏到资产" onClick={() => collectShot(shot.id)}><IconSave size={14} /></button>
        <button className="iconbtn-sm danger" title="删除镜头" onClick={() => removeShot(shot.id)}><IconTrash size={14} /></button>
      </div>
    </div>
  );
}

// —— 主组件 ——
export function DirectorStage3D() {
  const {
    stageObjects,
    stageShots,
    selectedStageId,
    selectStage,
    addStageObject,
    updateStageObject,
    takeShot,
    saveCurrent,
  } = useStudio();
  const apiRef = useRef<StageApi | null>(null);
  const [mode, setMode] = useState<"translate" | "rotate" | "scale">("translate");

  const register = useCallback((api: StageApi) => {
    apiRef.current = api;
  }, []);

  const handleShot = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const thumb = api.capture();
    const camera = api.getView();
    takeShot(thumb, camera);
  }, [takeShot]);

  const resetView = useCallback(() => {
    apiRef.current?.setView({ pos: [7, 5, 9], target: [0, 0.5, 0] });
  }, []);

  const restoreShot = useCallback((shot: import("../lib/types").StageShot) => {
    apiRef.current?.setView(shot.camera);
  }, []);

  // 防抖自动存稿（避免拖拽时高频写 IndexedDB）
  useEffect(() => {
    const t = setTimeout(() => saveCurrent(), 1200);
    return () => clearTimeout(t);
  }, [stageObjects, stageShots, saveCurrent]);

  return (
    <div className="stage-layout">
      {/* 左：调色板 */}
      <aside className="stage-palette">
        <div className="stage-palette__title">放置</div>
        <button className="stage-add" onClick={() => addStageObject("actor")}><IconCharacter size={16} /> 角色</button>
        <button className="stage-add" onClick={() => addStageObject("set")}><IconScene size={16} /> 场景台</button>
        <button className="stage-add" onClick={() => addStageObject("prop")}><IconCube size={16} /> 道具</button>
        <button className="stage-add" onClick={() => addStageObject("light")}><IconSpark size={16} /> 灯光</button>

        <div className="stage-palette__title">变换</div>
        <div className="seg">
          <button data-active={mode === "translate"} onClick={() => setMode("translate")}>移动</button>
          <button data-active={mode === "rotate"} onClick={() => setMode("rotate")}>旋转</button>
          <button data-active={mode === "scale"} onClick={() => setMode("scale")}>缩放</button>
        </div>
        <div className="stage-palette__hint">
          点击物体选中；拖拽 gizmo 变换；空白处拖动旋转视角、滚轮缩放。
        </div>
      </aside>

      {/* 中：3D 视口 */}
      <div className="stage-viewport">
        <div className="stage-toolbar">
          <Button size="sm" variant="primary" icon={<IconFilm size={15} />} onClick={handleShot}>
            拍摄镜头
          </Button>
          <div className="flow-toolbar__div" />
          <IconButton title="重置视角" onClick={resetView}><IconFilm size={16} /></IconButton>
          <div className="stage-toolbar__count">{stageObjects.length} 个对象 · {stageShots.length} 个镜头</div>
        </div>
        <div className="stage-canvas-wrap">
          <StageErrorBoundary fallback={<WebGLFallback />}>
            <Canvas
              shadows
              dpr={[1, 2]}
              gl={{ preserveDrawingBuffer: true, antialias: true }}
              camera={{ position: [7, 5, 9], fov: 45 }}
              onPointerMissed={() => selectStage(null)}
            >
              <StageScene
                objects={stageObjects}
                selectedId={selectedStageId}
                mode={mode}
                onSelect={selectStage}
                onTransform={updateStageObject}
              />
              <CaptureBridge register={register} />
            </Canvas>
          </StageErrorBoundary>
        </div>
      </div>

      {/* 右：检视器 */}
      <aside className="stage-inspector">
        <StageInspector />
      </aside>

      {/* 底：镜头时间线 */}
      <div className="stage-timeline">
        <div className="stage-timeline__head">
          <span className="eyebrow">镜头时间线</span>
          <span className="muted" style={{ fontSize: 12 }}>拍摄机位 → 生成 AI 关键帧 → 回灌画布 / 收藏</span>
        </div>
        <div className="stage-timeline__strip">
          {stageShots.length === 0 ? (
            <EmptyState
              icon={<IconFilm size={22} />}
              title="还没有镜头"
              hint="摆放好角色与场景后，点「拍摄镜头」记录一个机位。"
            />
          ) : (
            stageShots.map((s) => <ShotCard key={s.id} shot={s} onView={restoreShot} />)
          )}
        </div>
      </div>
    </div>
  );
}
