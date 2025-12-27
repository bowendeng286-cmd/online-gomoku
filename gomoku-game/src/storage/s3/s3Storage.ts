import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import path from "path";

// 允许的文件名字符集
const FILE_NAME_ALLOWED_RE = /^[A-Za-z0-9._\-/]+$/;

export interface ListFilesResult {
  keys: string[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

export interface S3StorageConfig {
  endpointUrl?: string;
  accessKey?: string;
  secretKey?: string;
  bucketName?: string;
  region?: string;
}

/**
 * 获取 storage token
 */
function getStorageToken(): string | null {
  return process.env.COZE_WORKLOAD_IDENTITY_API_KEY || null;
}

export class S3Storage {
  private endpointUrl: string;
  private accessKey: string;
  private secretKey: string;
  private bucketName: string;
  private region: string;
  private client: S3Client | null = null;

  constructor(config: S3StorageConfig = {}) {
    this.endpointUrl = process.env.COZE_BUCKET_ENDPOINT_URL || config.endpointUrl || "";
    this.accessKey = config.accessKey || "";
    this.secretKey = config.secretKey || "";
    this.bucketName = process.env.COZE_BUCKET_NAME || config.bucketName || "";
    this.region = config.region || "cn-beijing";
  }

  private getClient(): S3Client {
    if (!this.client) {
      if (!this.endpointUrl) {
        throw new Error("未配置存储端点：请设置 COZE_BUCKET_ENDPOINT_URL");
      }

      this.client = new S3Client({
        endpoint: this.endpointUrl,
        region: this.region,
        credentials: {
          accessKeyId: this.accessKey,
          secretAccessKey: this.secretKey,
        },
        forcePathStyle: true,
      });

      // 注册 middleware 注入 x-storage-token 头
      this.client.middlewareStack.add(
        (next) => async (args: any) => {
          const token = getStorageToken();
          if (token && args.request?.headers) {
            args.request.headers["x-storage-token"] = token;
          }
          return next(args);
        },
        {
          step: "build",
          name: "injectStorageToken",
        }
      );
    }
    return this.client;
  }

  private generateObjectKey(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const stem = path.basename(originalName, ext);
    const uniq = randomUUID().replace(/-/g, "").slice(0, 8);
    return path.join(path.dirname(originalName), `${stem}_${uniq}${ext}`);
  }

  private resolveBucket(bucket?: string): string {
    const targetBucket = bucket || process.env.COZE_BUCKET_NAME || this.bucketName;
    if (!targetBucket) {
      throw new Error("未配置 bucket：请传入 bucket 或设置 COZE_BUCKET_NAME");
    }
    return targetBucket;
  }

  private validateFileName(name: string): void {
    const msg =
      "file name invalid: 文件名需满足以下 S3 对象命名规范：" +
      "1) 长度 1–1024 字节；" +
      "2) 仅允许字母、数字、点(.)、下划线(_)、短横(-)、目录分隔符(/)；" +
      "3) 不允许空格或特殊字符；" +
      "4) 不以 / 开头或结尾，且不包含连续的 //；";

    if (!name || !name.trim()) {
      throw new Error(msg + "（原因：文件名为空）");
    }

    if (Buffer.byteLength(name, "utf-8") > 1024) {
      throw new Error(msg + "（原因：长度超过 1024 字节）");
    }

    if (name.startsWith("/") || name.endsWith("/")) {
      throw new Error(msg + "（原因：以 / 开头或结尾）");
    }

    if (name.includes("//")) {
      throw new Error(msg + "（原因：包含连续的 //）");
    }

    if (!FILE_NAME_ALLOWED_RE.test(name)) {
      const bad = name.match(/[^A-Za-z0-9._\-/]/);
      throw new Error(msg + `（原因：包含非法字符，例如：${bad?.[0] || "非法字符"}）`);
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(options: {
    fileContent: Buffer;
    fileName: string;
    contentType?: string;
    bucket?: string;
  }): Promise<string> {
    const { fileContent, fileName, contentType = "application/octet-stream", bucket } = options;

    this.validateFileName(fileName);

    const client = this.getClient();
    const objectKey = this.generateObjectKey(fileName);
    const targetBucket = this.resolveBucket(bucket);

    await client.send(
      new PutObjectCommand({
        Bucket: targetBucket,
        Key: objectKey,
        Body: fileContent,
        ContentType: contentType,
      })
    );

    return objectKey;
  }

  /**
   * 读取文件
   */
  async readFile(options: { fileKey: string; bucket?: string }): Promise<Buffer> {
    const { fileKey, bucket } = options;

    const client = this.getClient();
    const targetBucket = this.resolveBucket(bucket);

    const response = await client.send(
      new GetObjectCommand({
        Bucket: targetBucket,
        Key: fileKey,
      })
    );

    if (!response.Body) {
      throw new Error("S3 get_object returned no Body");
    }

    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as Readable) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * 删除文件
   */
  async deleteFile(options: { fileKey: string; bucket?: string }): Promise<boolean> {
    const { fileKey, bucket } = options;

    const client = this.getClient();
    const targetBucket = this.resolveBucket(bucket);

    await client.send(
      new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: fileKey,
      })
    );

    return true;
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(options: { fileKey: string; bucket?: string }): Promise<boolean> {
    const { fileKey, bucket } = options;

    const client = this.getClient();
    const targetBucket = this.resolveBucket(bucket);

    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: targetBucket,
          Key: fileKey,
        })
      );
      return true;
    } catch (e: any) {
      if (e.name === "NotFound" || e.$metadata?.httpStatusCode === 404) {
        return false;
      }
      console.error("Error checking file existence in S3:", e);
      return false;
    }
  }

  /**
   * 列出文件
   */
  async listFiles(options: {
    prefix?: string;
    bucket?: string;
    maxKeys?: number;
    continuationToken?: string;
  } = {}): Promise<ListFilesResult> {
    const { prefix, bucket, maxKeys = 1000, continuationToken } = options;

    if (maxKeys <= 0 || maxKeys > 1000) {
      throw new Error("maxKeys 必须在 1 到 1000 之间");
    }

    const client = this.getClient();
    const targetBucket = this.resolveBucket(bucket);

    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: targetBucket,
        MaxKeys: maxKeys,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    const keys = (response.Contents || [])
      .filter((item) => item.Key)
      .map((item) => item.Key!);

    return {
      keys,
      isTruncated: response.IsTruncated || false,
      nextContinuationToken: response.NextContinuationToken,
    };
  }

  /**
   * 生成签名 URL（通过 S3 Proxy）
   */
  async generatePresignedUrl(options: {
    key: string;
    bucket?: string;
    expireTime?: number;
  }): Promise<string> {
    const { key, bucket, expireTime = 1800 } = options;

    const token = getStorageToken();
    if (!token) {
      throw new Error("获取 x-storage-token 失败：请设置 COZE_WORKLOAD_IDENTITY_API_KEY 环境变量");
    }

    const signBase = process.env.COZE_BUCKET_ENDPOINT_URL || this.endpointUrl;
    if (!signBase) {
      throw new Error("未配置签名端点：请设置 COZE_BUCKET_ENDPOINT_URL");
    }

    const signUrlEndpoint = signBase.replace(/\/$/, "") + "/sign-url";
    const targetBucket = this.resolveBucket(bucket);

    const payload = {
      bucket_name: targetBucket,
      path: key,
      expire_time: expireTime,
    };

    const response = await fetch(signUrlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-storage-token": token,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`生成签名URL失败: ${response.status}`);
    }

    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json") || text.trim().startsWith("{")) {
      try {
        const obj = JSON.parse(text);
        const data = obj.data;
        if (typeof data === "object" && data?.url) {
          return data.url;
        }
        const urlValue = obj.url || obj.signed_url || obj.presigned_url;
        if (urlValue) {
          return urlValue;
        }
        throw new Error("签名服务返回缺少 data.url/url 字段");
      } catch {
        return text;
      }
    }
    return text;
  }

  /**
   * 流式上传（从 Readable stream）
   */
  async streamUploadFile(options: {
    stream: Readable;
    fileName: string;
    contentType?: string;
    bucket?: string;
  }): Promise<string> {
    const { stream, fileName, contentType = "application/octet-stream", bucket } = options;

    const client = this.getClient();
    const objectKey = this.generateObjectKey(fileName);
    const targetBucket = this.resolveBucket(bucket);

    const upload = new Upload({
      client,
      params: {
        Bucket: targetBucket,
        Key: objectKey,
        Body: stream,
        ContentType: contentType,
      },
    });

    await upload.done();
    return objectKey;
  }

  /**
   * 从 URL 下载并上传
   */
  async uploadFromUrl(options: {
    url: string;
    bucket?: string;
    timeout?: number;
  }): Promise<string> {
    const { url, bucket, timeout = 30000 } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      const urlObj = new URL(url);
      const fileName = path.basename(decodeURIComponent(urlObj.pathname)) || "file";
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const buffer = Buffer.from(await response.arrayBuffer());

      return this.uploadFile({
        fileContent: buffer,
        fileName,
        contentType,
        bucket,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 分块上传（从 AsyncIterable）
   */
  async chunkUploadFile(options: {
    chunks: AsyncIterable<Buffer>;
    fileName: string;
    contentType?: string;
    bucket?: string;
  }): Promise<string> {
    const { chunks, fileName, contentType = "application/octet-stream", bucket } = options;

    const client = this.getClient();
    const objectKey = this.generateObjectKey(fileName);
    const targetBucket = this.resolveBucket(bucket);

    // 将 AsyncIterable 转换为 Readable stream
    const stream = Readable.from(chunks);

    const upload = new Upload({
      client,
      params: {
        Bucket: targetBucket,
        Key: objectKey,
        Body: stream,
        ContentType: contentType,
      },
    });

    await upload.done();
    return objectKey;
  }
}

export default S3Storage;
