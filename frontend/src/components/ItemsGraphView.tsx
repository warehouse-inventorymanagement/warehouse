import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { CubeIcon } from '@heroicons/react/24/outline';
import { Icon } from '@iconify/react';
import { itemsApi } from '../services/api';
import type { SubItem, SubItemTreeNode } from '../types';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 80;

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function ItemNode({ data }: NodeProps) {
  const navigate = useNavigate();
  const quantity = data.quantity as number;
  const minQuantity = data.minQuantity as number;
  const isLowStock = quantity <= minQuantity && minQuantity > 0;
  const isOutOfStock = quantity === 0;
  const hasChildren = (data.subItemsCount as number) > 0;
  const isRoot = data.isRoot as boolean;

  const borderColor = isOutOfStock
    ? '#ef4444'
    : isLowStock
    ? '#f97316'
    : '#22c55e';

  return (
    <div
      className="flex flex-col items-center cursor-pointer"
      onClick={() => navigate(`/items/${data.itemId}`)}
    >
      <Handle type="target" position={Position.Left} style={{ background: 'var(--bg-tertiary)', border: 'none', width: 6, height: 6 }} />

      {/* Circle node */}
      <div
        className="rounded-full flex items-center justify-center overflow-hidden"
        style={{
          width: isRoot ? 64 : 56,
          height: isRoot ? 64 : 56,
          border: `3px solid ${isRoot ? 'var(--accent)' : borderColor}`,
          backgroundColor: 'var(--bg-secondary)',
          boxShadow: isRoot ? `0 0 12px var(--accent)40` : `0 0 8px ${borderColor}30`,
        }}
      >
        {data.image ? (
          <img
            src={`/uploads/${data.image}`}
            alt={data.label as string}
            className="w-full h-full object-cover rounded-full"
          />
        ) : data.icon ? (
          <Icon
            icon={data.icon as string}
            className="w-6 h-6"
            style={{ color: (data.iconColor as string) || 'var(--accent)' }}
          />
        ) : (
          <CubeIcon className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
        )}
      </div>

      {/* Label */}
      <div className="mt-1.5 text-center max-w-[130px]">
        <p
          className="text-xs font-medium truncate leading-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.label as string}
        </p>
        <p
          className="text-[10px] leading-tight"
          style={{ color: isLowStock || isOutOfStock ? borderColor : 'var(--text-secondary)' }}
        >
          {data.quantity as number} in stock
        </p>
      </div>

      {/* Expand indicator */}
      {hasChildren && !data.expanded && (
        <div
          className="absolute -right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'white',
          }}
          title={`${data.subItemsCount} sub-items`}
        >
          {data.subItemsCount as number}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: 'var(--bg-tertiary)', border: 'none', width: 6, height: 6 }} />
    </div>
  );
}

const nodeTypes = { itemNode: ItemNode };

function buildNodeFromTreeNode(node: SubItemTreeNode, parentId: string): { node: Node; edge: Edge } {
  const image = node.childItem.images?.[0]?.filename;
  const icon = node.childItem.template?.icon || node.childItem.category?.icon;
  const iconColor = (node.childItem.template as any)?.iconColor || (node.childItem.category as any)?.iconColor;

  return {
    node: {
      id: node.childItemId,
      type: 'itemNode',
      position: { x: 0, y: 0 },
      data: {
        label: node.childItem.name,
        itemId: node.childItemId,
        quantity: node.childItem.quantity,
        minQuantity: node.quantityRequired,
        subItemsCount: node.childrenCount,
        image,
        icon,
        iconColor,
        expanded: false,
        isRoot: false,
      },
    },
    edge: {
      id: `e-${parentId}-${node.childItemId}`,
      source: parentId,
      target: node.childItemId,
      type: 'smoothstep',
      style: { stroke: 'var(--bg-tertiary)', strokeWidth: 2 },
      animated: false,
    },
  };
}

interface ItemsGraphViewProps {
  itemId: string;
  itemName: string;
  itemQuantity: number;
  itemMinQuantity: number;
  itemImage?: string;
  itemIcon?: string;
  itemIconColor?: string;
  subItems: SubItem[];
}

export default function ItemsGraphView({
  itemId,
  itemName,
  itemQuantity,
  itemMinQuantity,
  itemImage,
  itemIcon,
  itemIconColor,
  subItems,
}: ItemsGraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [loadedParents, setLoadedParents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Build root node from the current item
    const rootNode: Node = {
      id: itemId,
      type: 'itemNode',
      position: { x: 0, y: 0 },
      data: {
        label: itemName,
        itemId,
        quantity: itemQuantity,
        minQuantity: itemMinQuantity,
        subItemsCount: subItems.length,
        image: itemImage,
        icon: itemIcon,
        iconColor: itemIconColor,
        expanded: true,
        isRoot: true,
      },
    };

    if (!subItems.length) {
      const layouted = getLayoutedElements([rootNode], []);
      setNodes(layouted.nodes);
      setEdges([]);
      setLoading(false);
      return;
    }

    // Build child nodes from subItems
    const childNodes: Node[] = [];
    const childEdges: Edge[] = [];

    subItems.forEach((sub) => {
      const image = sub.childItem.images?.[0]?.filename;
      const icon = sub.childItem.template?.icon || sub.childItem.category?.icon;
      const iconColor = (sub.childItem.template as any)?.iconColor || (sub.childItem.category as any)?.iconColor;

      childNodes.push({
        id: sub.childItem.id,
        type: 'itemNode',
        position: { x: 0, y: 0 },
        data: {
          label: sub.childItem.name,
          itemId: sub.childItem.id,
          quantity: sub.childItem.quantity,
          minQuantity: sub.quantityRequired,
          subItemsCount: sub.childItem._count?.subItems ?? 0,
          image,
          icon,
          iconColor,
          expanded: false,
          isRoot: false,
        },
      });

      childEdges.push({
        id: `e-${itemId}-${sub.childItem.id}`,
        source: itemId,
        target: sub.childItem.id,
        type: 'smoothstep',
        style: { stroke: 'var(--bg-tertiary)', strokeWidth: 2 },
        animated: false,
      });
    });

    const allNodes = [rootNode, ...childNodes];
    const layouted = getLayoutedElements(allNodes, childEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    setLoadedParents(new Set([itemId]));
    setLoading(false);
  }, [itemId, subItems]);

  // Handle node click to expand sub-items
  const onNodeClick = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      const subItemsCount = node.data.subItemsCount as number;
      if (subItemsCount === 0 || loadedParents.has(node.id)) return;

      try {
        const response = await itemsApi.getSubItemTree(node.id);
        const children: SubItemTreeNode[] = response.data.data;

        setLoadedParents((prev) => new Set(prev).add(node.id));

        setNodes((prevNodes) => {
          const newNodes: Node[] = [];
          const newEdges: Edge[] = [];

          children.forEach((child) => {
            const { node: childNode, edge } = buildNodeFromTreeNode(child, node.id);
            if (!prevNodes.find((n) => n.id === childNode.id) && !newNodes.find((n) => n.id === childNode.id)) {
              newNodes.push(childNode);
            }
            newEdges.push(edge);
          });

          const updatedNodes = prevNodes.map((n) =>
            n.id === node.id ? { ...n, data: { ...n.data, expanded: true } } : n
          );

          const allNodes = [...updatedNodes, ...newNodes];

          setEdges((prevEdges) => {
            const allEdges = [...prevEdges, ...newEdges];
            const layouted = getLayoutedElements(allNodes, allEdges);
            setTimeout(() => {
              setNodes(layouted.nodes);
              setEdges(layouted.edges);
            }, 0);
            return prevEdges;
          });

          return prevNodes;
        });
      } catch {
        // Silently fail
      }
    },
    [loadedParents, setNodes, setEdges]
  );

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '400px' }}>
        <div
          className="animate-spin rounded-full h-10 w-10 border-b-2"
          style={{ borderColor: 'var(--accent)' }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden react-flow-dark" style={{ height: '400px', backgroundColor: 'var(--bg-primary)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={proOptions}
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <Background color="var(--bg-tertiary)" gap={20} size={1} />
        <Controls
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--bg-tertiary)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        />
        <MiniMap
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--bg-tertiary)',
            borderRadius: '8px',
          }}
          nodeColor={() => 'var(--accent)'}
          maskColor="rgba(0, 0, 0, 0.5)"
        />
      </ReactFlow>
    </div>
  );
}
