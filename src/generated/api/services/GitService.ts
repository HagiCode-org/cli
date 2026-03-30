/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_DomainServices_Contracts_GitCommitRequestDto } from '../models/PCode_DomainServices_Contracts_GitCommitRequestDto';
import type { PCode_DomainServices_Contracts_GitCommitResponseDto } from '../models/PCode_DomainServices_Contracts_GitCommitResponseDto';
import type { PCode_DomainServices_Contracts_GitRebaseRequestDto } from '../models/PCode_DomainServices_Contracts_GitRebaseRequestDto';
import type { PCode_DomainServices_Contracts_GitRebaseResponseDto } from '../models/PCode_DomainServices_Contracts_GitRebaseResponseDto';
import type { PCode_DomainServices_Contracts_GitRemoteSyncResponseDto } from '../models/PCode_DomainServices_Contracts_GitRemoteSyncResponseDto';
import type { PCode_DomainServices_GitDiffDto } from '../models/PCode_DomainServices_GitDiffDto';
import type { PCode_DomainServices_GitStatusDto } from '../models/PCode_DomainServices_GitStatusDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GitService {
  /**
   * 获取 Git 状态
   * @returns PCode_DomainServices_GitStatusDto 成功获取 Git 状态
   * @throws ApiError
   */
  public static getApiGitStatus({
    projectId,
    repositoryPath,
  }: {
    /**
     * 项目 ID（可选）
     */
    projectId?: string,
    /**
     * 仓库路径（可选）
     */
    repositoryPath?: string,
  }): CancelablePromise<PCode_DomainServices_GitStatusDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/git/status',
      query: {
        'projectId': projectId,
        'repositoryPath': repositoryPath,
      },
      errors: {
        400: `必须提供 projectId`,
        404: `项目不存在`,
      },
    });
  }
  /**
   * 获取文件 diff 内容
   * @returns PCode_DomainServices_GitDiffDto 成功获取 diff
   * @throws ApiError
   */
  public static getApiGitDiff({
    projectId,
    repositoryPath,
    filePath,
    staged = false,
  }: {
    /**
     * 项目 ID（可选）
     */
    projectId?: string,
    /**
     * 仓库路径（可选）
     */
    repositoryPath?: string,
    /**
     * 文件路径
     */
    filePath?: string,
    /**
     * 是否查看已暂存的 diff
     */
    staged?: boolean,
  }): CancelablePromise<PCode_DomainServices_GitDiffDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/git/diff',
      query: {
        'projectId': projectId,
        'repositoryPath': repositoryPath,
        'filePath': filePath,
        'staged': staged,
      },
      errors: {
        400: `文件路径为空`,
        404: `项目或文件不存在`,
      },
    });
  }
  /**
   * 获取当前分支名
   * @returns any 成功获取分支名
   * @throws ApiError
   */
  public static getApiGitBranch({
    projectId,
  }: {
    /**
     * 项目 ID
     */
    projectId?: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/git/branch',
      query: {
        'projectId': projectId,
      },
      errors: {
        404: `项目不存在或不是 Git 仓库`,
      },
    });
  }
  /**
   * 暂存单个文件
   * @returns any 成功暂存文件
   * @throws ApiError
   */
  public static postApiGitStage({
    projectId,
    repositoryPath,
    filePath,
  }: {
    /**
     * 项目 ID（可选）
     */
    projectId?: string,
    /**
     * 仓库路径（可选）
     */
    repositoryPath?: string,
    /**
     * 文件路径
     */
    filePath?: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/git/stage',
      query: {
        'projectId': projectId,
        'repositoryPath': repositoryPath,
        'filePath': filePath,
      },
      errors: {
        400: `文件路径为空`,
      },
    });
  }
  /**
   * 取消暂存单个文件
   * @returns any 成功取消暂存
   * @throws ApiError
   */
  public static postApiGitUnstage({
    projectId,
    repositoryPath,
    filePath,
  }: {
    /**
     * 项目 ID（可选）
     */
    projectId?: string,
    /**
     * 仓库路径（可选）
     */
    repositoryPath?: string,
    /**
     * 文件路径
     */
    filePath?: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/git/unstage',
      query: {
        'projectId': projectId,
        'repositoryPath': repositoryPath,
        'filePath': filePath,
      },
      errors: {
        400: `文件路径为空`,
      },
    });
  }
  /**
   * 撤销单个文件的工作区修改
   * 该接口只回退目标文件的工作区内容，不会影响同仓库中的其他文件，也不会清除该文件已暂存的内容。
   * 当前前端仅对未暂存文件暴露此入口。
   * @returns any 成功处理单文件工作区撤销请求
   * @throws ApiError
   */
  public static deleteApiGitDiscard({
    projectId,
    repositoryPath,
    filePath,
  }: {
    /**
     * 项目 ID（可选）
     */
    projectId?: string,
    /**
     * 仓库路径（可选）
     */
    repositoryPath?: string,
    /**
     * 文件路径
     */
    filePath?: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/git/discard',
      query: {
        'projectId': projectId,
        'repositoryPath': repositoryPath,
        'filePath': filePath,
      },
      errors: {
        400: `projectId、repositoryPath 或 filePath 无效`,
      },
    });
  }
  /**
   * 暂存所有变更
   * @returns any 成功暂存所有变更
   * @throws ApiError
   */
  public static postApiGitStageAll({
    projectId,
    repositoryPath,
  }: {
    /**
     * 项目 ID（可选）
     */
    projectId?: string,
    /**
     * 仓库路径（可选）
     */
    repositoryPath?: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/git/stage-all',
      query: {
        'projectId': projectId,
        'repositoryPath': repositoryPath,
      },
    });
  }
  /**
   * 取消暂存所有变更
   * @returns any 成功取消暂存所有变更
   * @throws ApiError
   */
  public static postApiGitUnstageAll({
    projectId,
    repositoryPath,
  }: {
    /**
     * 项目 ID（可选）
     */
    projectId?: string,
    /**
     * 仓库路径（可选）
     */
    repositoryPath?: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/git/unstage-all',
      query: {
        'projectId': projectId,
        'repositoryPath': repositoryPath,
      },
    });
  }
  /**
   * 提交变更
   * @returns PCode_DomainServices_Contracts_GitCommitResponseDto 成功提交
   * @throws ApiError
   */
  public static postApiGitCommit({
    projectId,
    repositoryPath,
    requestBody,
  }: {
    /**
     * 项目 ID（可选）
     */
    projectId?: string,
    /**
     * 仓库路径（可选）
     */
    repositoryPath?: string,
    /**
     * 提交请求
     */
    requestBody?: PCode_DomainServices_Contracts_GitCommitRequestDto,
  }): CancelablePromise<PCode_DomainServices_Contracts_GitCommitResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/git/commit',
      query: {
        'projectId': projectId,
        'repositoryPath': repositoryPath,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `提交消息为空`,
      },
    });
  }
  /**
   * 推送当前分支到 upstream
   * @returns PCode_DomainServices_Contracts_GitRemoteSyncResponseDto OK
   * @throws ApiError
   */
  public static postApiGitPush({
    projectId,
    repositoryPath,
  }: {
    projectId?: string,
    repositoryPath?: string,
  }): CancelablePromise<PCode_DomainServices_Contracts_GitRemoteSyncResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/git/push',
      query: {
        'projectId': projectId,
        'repositoryPath': repositoryPath,
      },
    });
  }
  /**
   * 以 fast-forward-only 模式拉取当前分支 upstream
   * @returns PCode_DomainServices_Contracts_GitRemoteSyncResponseDto OK
   * @throws ApiError
   */
  public static postApiGitPull({
    projectId,
    repositoryPath,
  }: {
    projectId?: string,
    repositoryPath?: string,
  }): CancelablePromise<PCode_DomainServices_Contracts_GitRemoteSyncResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/git/pull',
      query: {
        'projectId': projectId,
        'repositoryPath': repositoryPath,
      },
    });
  }
  /**
   * 将当前分支 rebase 到远程同名分支。
   * 当前版本不支持选择目标分支；若发生冲突会自动 abort 并恢复仓库状态。
   * @returns PCode_DomainServices_Contracts_GitRebaseResponseDto OK
   * @throws ApiError
   */
  public static postApiGitRebase({
    projectId,
    repositoryPath,
    requestBody,
  }: {
    projectId?: string,
    repositoryPath?: string,
    requestBody?: PCode_DomainServices_Contracts_GitRebaseRequestDto,
  }): CancelablePromise<PCode_DomainServices_Contracts_GitRebaseResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/git/rebase',
      query: {
        'projectId': projectId,
        'repositoryPath': repositoryPath,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
}
