import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksBenchmark extends Struct.ComponentSchema {
  collectionName: 'components_blocks_benchmarks';
  info: {
    description: 'A benchmark chart with one or more datasets';
    displayName: 'Benchmark';
  };
  attributes: {
    datasets: Schema.Attribute.Component<'blocks.benchmark-dataset', true>;
    dataUpdatedAt: Schema.Attribute.String;
    source: Schema.Attribute.String;
    sourceUrl: Schema.Attribute.String;
  };
}

export interface BlocksBenchmarkBar extends Struct.ComponentSchema {
  collectionName: 'components_blocks_benchmark_bars';
  info: {
    description: 'One measured value in a benchmark dataset';
    displayName: 'Benchmark Bar';
  };
  attributes: {
    name: Schema.Attribute.String;
    value: Schema.Attribute.Decimal;
    version: Schema.Attribute.String;
  };
}

export interface BlocksBenchmarkDataset extends Struct.ComponentSchema {
  collectionName: 'components_blocks_benchmark_datasets';
  info: {
    description: 'One metric shown in the benchmark chart';
    displayName: 'Benchmark Dataset';
  };
  attributes: {
    bars: Schema.Attribute.Component<'blocks.benchmark-bar', true>;
    label: Schema.Attribute.String;
    note: Schema.Attribute.String;
    unit: Schema.Attribute.String;
  };
}

export interface BlocksCallout extends Struct.ComponentSchema {
  collectionName: 'components_blocks_callouts';
  info: {
    description: 'A taped note that breaks the flow of the article';
    displayName: 'Callout';
  };
  attributes: {
    body: Schema.Attribute.Blocks;
    type: Schema.Attribute.Enumeration<['info', 'warning', 'success']> &
      Schema.Attribute.DefaultTo<'info'>;
  };
}

export interface BlocksDataTable extends Struct.ComponentSchema {
  collectionName: 'components_blocks_data_tables';
  info: {
    description: 'A data table (the Blocks editor has no native table)';
    displayName: 'Table';
  };
  attributes: {
    availability: Schema.Attribute.Enumeration<['full', 'partial']> &
      Schema.Attribute.DefaultTo<'full'>;
    caption: Schema.Attribute.String;
    headers: Schema.Attribute.JSON;
    rows: Schema.Attribute.JSON;
  };
}

export interface BlocksFlowDiagram extends Struct.ComponentSchema {
  collectionName: 'components_blocks_flow_diagrams';
  info: {
    description: 'A vertical sequence of steps, e.g. an architecture flow';
    displayName: 'Flow Diagram';
  };
  attributes: {
    label: Schema.Attribute.String;
    steps: Schema.Attribute.Component<'blocks.flow-step', true>;
  };
}

export interface BlocksFlowStep extends Struct.ComponentSchema {
  collectionName: 'components_blocks_flow_steps';
  info: {
    description: 'One node in a flow diagram';
    displayName: 'Flow Step';
  };
  attributes: {
    label: Schema.Attribute.String;
    note: Schema.Attribute.String;
  };
}

export interface BlocksGallery extends Struct.ComponentSchema {
  collectionName: 'components_blocks_galleries';
  info: {
    description: 'A swipeable gallery of screenshots';
    displayName: 'Gallery';
  };
  attributes: {
    images: Schema.Attribute.Media<'images', true> & Schema.Attribute.Required;
    title: Schema.Attribute.String;
  };
}

export interface BlocksGlanceItem extends Struct.ComponentSchema {
  collectionName: 'components_blocks_glance_items';
  info: {
    description: 'A label/value pair in the project glance box';
    displayName: 'Glance Item';
  };
  attributes: {
    label: Schema.Attribute.String;
    value: Schema.Attribute.String;
  };
}

export interface BlocksImage extends Struct.ComponentSchema {
  collectionName: 'components_blocks_images';
  info: {
    description: 'A single captioned image';
    displayName: 'Image';
  };
  attributes: {
    caption: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    wide: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface BlocksProjectGlance extends Struct.ComponentSchema {
  collectionName: 'components_blocks_project_glances';
  info: {
    description: 'The at-a-glance facts box near the top of a project';
    displayName: 'Project Glance';
  };
  attributes: {
    items: Schema.Attribute.Component<'blocks.glance-item', true>;
    stack: Schema.Attribute.JSON;
    title: Schema.Attribute.String;
  };
}

export interface BlocksRichText extends Struct.ComponentSchema {
  collectionName: 'components_blocks_rich_texts';
  info: {
    description: 'Paragraphs, headings, lists, quotes, code and inline images';
    displayName: 'Rich Text';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
  };
}

export interface BlocksTechBadge extends Struct.ComponentSchema {
  collectionName: 'components_blocks_tech_badges';
  info: {
    description: 'A technology with a short reason for choosing it';
    displayName: 'Tech Badge';
  };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    reason: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'blocks.benchmark': BlocksBenchmark;
      'blocks.benchmark-bar': BlocksBenchmarkBar;
      'blocks.benchmark-dataset': BlocksBenchmarkDataset;
      'blocks.callout': BlocksCallout;
      'blocks.data-table': BlocksDataTable;
      'blocks.flow-diagram': BlocksFlowDiagram;
      'blocks.flow-step': BlocksFlowStep;
      'blocks.gallery': BlocksGallery;
      'blocks.glance-item': BlocksGlanceItem;
      'blocks.image': BlocksImage;
      'blocks.project-glance': BlocksProjectGlance;
      'blocks.rich-text': BlocksRichText;
      'blocks.tech-badge': BlocksTechBadge;
    }
  }
}
