/**
 * Copyright 2023-present DreamNum Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import styles from './index.module.less';

interface ISpinProps {
    loading: boolean;
    children: React.ReactNode;
}

const Spin = ({ loading, children }: ISpinProps) => {
    return (
        <div className={styles.spinContainer}>
            {loading && (
                <div className={styles.spinOverlay}>
                    <div className={styles.spinner}></div>
                </div>
            )}
            <div className={loading ? styles.contentBlur : ''}>
                {children}
            </div>
        </div>
    );
};

export default Spin;
