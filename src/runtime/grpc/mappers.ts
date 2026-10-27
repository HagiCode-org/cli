/**
 * Generic proto-to-DTO conversion for the CLI's gRPC facade (a copy of the conversion repos/web uses).
 *
 * The proto messages are written so that their protobuf JSON form has the same field names, enum text, null handling and
 * timestamp text as the REST JSON, so a message converts to the DTO type a REST call returned by way of `toJson`. The only
 * differences are handled here: 64-bit integers (`toJson` writes them as strings, the REST JSON as numbers) and absent
 * values (an unset optional field, message or wrapper stays absent; an empty list or map comes back empty, because proto has
 * no "absent list").
 */

import { fromJson, toJson, type DescField, type DescMessage, type JsonValue, type Message } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';
import { ScalarType } from '@bufbuild/protobuf';

const INT64_SCALARS = new Set<ScalarType>([ScalarType.INT64, ScalarType.UINT64, ScalarType.SINT64, ScalarType.FIXED64, ScalarType.SFIXED64]);

const isWellKnown = (message: DescMessage): boolean => message.typeName.startsWith('google.protobuf.');

// A 64-bit value becomes a number when it is a safe integer. A larger value stays the decimal string toJson wrote, because
// a rounded number would be wrong; no operation of this API produces one today.
function toNumber(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : value;
}

function convertMessage(descriptor: DescMessage, value: JsonValue | undefined): unknown {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value) || isWellKnown(descriptor)) {
    return value;
  }
  const record = value as Record<string, JsonValue>;
  for (const field of descriptor.fields) {
    const current = record[field.jsonName];
    if (current !== undefined) {
      record[field.jsonName] = convertField(field, current) as JsonValue;
    }
  }
  return record;
}

function convertField(field: DescField, value: JsonValue): unknown {
  switch (field.fieldKind) {
    case 'scalar':
      return INT64_SCALARS.has(field.scalar) ? toNumber(value) : value;
    case 'message':
      return convertMessage(field.message, value);
    case 'list':
      if (!Array.isArray(value)) {
        return value;
      }
      if (field.listKind === 'scalar') {
        return INT64_SCALARS.has(field.scalar) ? value.map(toNumber) : value;
      }
      return field.listKind === 'message' ? value.map(item => convertMessage(field.message, item)) : value;
    case 'map': {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return value;
      }
      const record = value as Record<string, JsonValue>;
      for (const key of Object.keys(record)) {
        if (field.mapKind === 'scalar' && INT64_SCALARS.has(field.scalar)) {
          record[key] = toNumber(record[key]) as JsonValue;
        } else if (field.mapKind === 'message') {
          record[key] = convertMessage(field.message, record[key]) as JsonValue;
        }
      }
      return record;
    }
    default:
      return value;
  }
}

/** The plain DTO a REST call returned, built from a proto message. */
export function protoToDto<T>(schema: GenMessage<Message>, message: Message): T {
  const json = toJson(schema, message, { alwaysEmitImplicit: true });
  return convertMessage(schema, json) as T;
}

/**
 * The `result` of a response message as the DTO (or list, or scalar) the REST call returned. Every RPC of the migration
 * answers with `{ result }`.
 */
export function resultOf<T>(schema: GenMessage<Message>, response: Message): T {
  const converted = protoToDto<{ result?: T }>(schema, response);
  return converted.result as T;
}

// `map<string, string>` fields take strings only. The DTO types allow numbers, booleans and null there (path reference metadata),
// which protobuf JSON parsing rejects: a null entry is left out and a number or boolean is written as text.
function normalizeStringMaps(descriptor: DescMessage, value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || isWellKnown(descriptor) || depth > 8) {
    return value;
  }
  const record = value as Record<string, unknown>;
  for (const field of descriptor.fields) {
    const current = record[field.jsonName];
    if (current === null || typeof current !== 'object') {
      continue;
    }
    if (field.fieldKind === 'message') {
      normalizeStringMaps(field.message, current, depth + 1);
    } else if (field.fieldKind === 'list' && field.listKind === 'message' && Array.isArray(current)) {
      current.forEach(item => normalizeStringMaps(field.message, item, depth + 1));
    } else if (field.fieldKind === 'map' && !Array.isArray(current)) {
      const entries = current as Record<string, unknown>;
      for (const key of Object.keys(entries)) {
        const entry = entries[key];
        if (field.mapKind === 'scalar' && field.scalar === ScalarType.STRING) {
          if (entry === null) {
            delete entries[key];
          } else if (typeof entry === 'number' || typeof entry === 'boolean') {
            entries[key] = String(entry);
          }
        } else if (field.mapKind === 'message') {
          normalizeStringMaps(field.message, entry, depth + 1);
        }
      }
    }
  }
  return value;
}

/**
 * A request body DTO as the proto message the RPC takes. Unknown DTO properties are ignored. A property set to `undefined`
 * is left out, as REST serialization did: protobuf JSON parsing rejects it ("expected Array, got undefined").
 */
export function dtoToProto<S extends GenMessage<Message>>(schema: S, dto: unknown) {
  const json = dto === undefined ? dto : normalizeStringMaps(schema, JSON.parse(JSON.stringify(dto)));
  return fromJson(schema, json as JsonValue, { ignoreUnknownFields: true });
}
